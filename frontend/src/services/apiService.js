import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for streaming responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || 'Server error occurred';
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Unable to connect to server - please check your connection');
    } else {
      // Something else happened
      throw new Error('An unexpected error occurred');
    }
  }
);

/**
 * Send a chat message to the backend
 * @param {string} message - The user's message
 * @returns {Promise<string>} - The bot's response
 */
export const sendChatMessage = async (message) => {
  try {
    const response = await apiClient.post('/api/chat', {
      message: message,
      timestamp: new Date().toISOString(),
    });
    
    return response.data.response;
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
};

/**
 * Send a chat message with streaming response using SSE
 * @param {string} message - The user's message
 * @param {Function} onToken - Callback for each token received
 * @returns {Promise<string>} - The complete response
 */
export const sendChatMessageStream = async (message, onToken) => {
  return new Promise((resolve, reject) => {
    let fullResponse = '';

    try {
      // Create EventSource for SSE
      const url = new URL('/api/chat/stream', API_BASE_URL);
      
      // Use fetch to send POST data, then handle SSE
      fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          timestamp: new Date().toISOString(),
        }),
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if response is actually SSE
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/event-stream')) {
          throw new Error('Server did not return an event stream');
        }

        // Read the response stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const readStream = async () => {
          try {
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              
              // Keep the last incomplete line in the buffer
              buffer = lines.pop() || '';

              let currentEvent = null;
              let currentData = null;

              for (const line of lines) {
                if (line.startsWith('event: ')) {
                  currentEvent = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  try {
                    currentData = JSON.parse(line.slice(6));
                  } catch (error) {
                    console.warn('Failed to parse SSE data:', line, error.message);
                    continue;
                  }
                } else if (line === '' && currentEvent && currentData) {
                  // End of an SSE message, process it
                  if (currentEvent === 'chunk' && currentData.text) {
                    fullResponse += currentData.text;
                    if (onToken) {
                      onToken(fullResponse);
                    }
                  } else if (currentEvent === 'end') {
                    resolve(fullResponse);
                    return;
                  } else if (currentEvent === 'error') {
                    reject(new Error(currentData.message || 'Streaming error'));
                    return;
                  }
                  
                  // Reset for next message
                  currentEvent = null;
                  currentData = null;
                }
              }
            }
            
            // If we get here, stream ended without explicit 'end' event
            resolve(fullResponse);
          } catch (error) {
            reject(error);
          }
        };

        readStream();
      })
      .catch(reject);

    } catch (error) {
      console.error('Streaming chat API error:', error);
      reject(error);
    }
  });
};

/**
 * Check if the backend API is available
 * @returns {Promise<boolean>} - True if API is available
 */
export const checkApiHealth = async () => {
  try {
    await apiClient.get('/health');
    return true;
  } catch (error) {
    console.warn('API health check failed:', error.message);
    return false;
  }
};

export default {
  sendChatMessage,
  sendChatMessageStream,
  checkApiHealth,
}; 