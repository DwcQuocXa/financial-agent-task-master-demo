import { useState, useCallback, useEffect } from 'react';
import { checkApiHealth } from '../services/apiService';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isApiAvailable, setIsApiAvailable] = useState(null);

  console.log('useChat - messages count:', messages.length);

  // Check API health on mount
  useEffect(() => {
    const checkHealth = async () => {
      const available = await checkApiHealth();
      setIsApiAvailable(available);
    };
    checkHealth();
  }, []);

  // Add a message to the chat
  const addMessage = useCallback((message) => {
    console.log('Adding message:', message);
    setMessages(prev => [...prev, message]);
  }, []);

  // SUPER SIMPLE sendMessage - no streaming, just basic API call
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    
    console.log('🚀 Starting sendMessage with text:', text);
    
    // Step 1: Add user message immediately
    const userMessage = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    
    console.log('📝 Adding user message');
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      console.log('📝 New messages count:', newMessages.length);
      return newMessages;
    });
    
    // Step 2: Set loading state  
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 3: Call API (simple fetch, no streaming)
      console.log('🌐 Calling API...');
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🌐 API response:', data);
      
      // Step 4: Add bot response - handle new format with 'answer' field
      const botMessage = {
        id: Date.now() + 1,
        text: data.answer || data.message || 'No response received',
        sender: 'bot',
        timestamp: new Date(),
        // Add metadata if available
        metadata: {
          searchResultsUsed: data.searchResultsUsed,
          workflow: data.workflow,
          status: data.status
        }
      };
      
      console.log('🤖 Adding bot message');
      setMessages(prev => {
        const newMessages = [...prev, botMessage];
        console.log('🤖 New messages count:', newMessages.length);
        return newMessages;
      });
      
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
    
    console.log('✅ sendMessage completed');
  }, []);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    isTyping: false,
    error,
    isApiAvailable,
    sendMessage,
    clearChat,
    addMessage,
    retryLastMessage: () => {},
  };
}; 