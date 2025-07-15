/**
 * Perplexity AI Search Service
 * 
 * This service handles search operations using Perplexity AI for financial research.
 * It takes sub-questions from the planning step and performs online searches.
 */

const { ChatPerplexity } = require('@langchain/community/chat_models/perplexity');
const { getPerplexityConfig, logPerplexityConfigStatus } = require('./perplexityConfig');

let perplexityClient = null;

/**
 * Initialize the Perplexity client with proper configuration
 */
async function initializePerplexityClient() {
  try {
    console.log('[PERPLEXITY] Initializing Perplexity client...');
    
    // Log configuration status
    logPerplexityConfigStatus();
    
    // Get validated configuration
    const config = getPerplexityConfig();
    
    // Initialize the Perplexity client
    perplexityClient = new ChatPerplexity({
      apiKey: config.apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
    
    console.log('[PERPLEXITY] ✅ Perplexity client initialized successfully');
    console.log(`[PERPLEXITY] Using model: ${config.model}`);
    
    return perplexityClient;
    
  } catch (error) {
    console.error('[PERPLEXITY] ❌ Failed to initialize Perplexity client:', error.message);
    throw new Error(`Perplexity initialization failed: ${error.message}`);
  }
}

/**
 * Test the Perplexity connection with a simple query
 */
async function testPerplexityConnection() {
  try {
    console.log('[PERPLEXITY] Testing Perplexity connection...');
    
    if (!perplexityClient) {
      await initializePerplexityClient();
    }
    
    // Simple test query
    const testResponse = await perplexityClient.invoke('What is the current year?');
    
    console.log('[PERPLEXITY] ✅ Perplexity connection test successful');
    console.log('[PERPLEXITY] Test response:', testResponse.content);
    
    return {
      success: true,
      response: testResponse.content
    };
    
  } catch (error) {
    console.error('[PERPLEXITY] ❌ Perplexity connection test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the initialized Perplexity client (initializes if needed)
 */
async function getPerplexityClient() {
  if (!perplexityClient) {
    await initializePerplexityClient();
  }
  return perplexityClient;
}

/**
 * Create a financial search prompt optimized for Perplexity
 */
function createFinancialSearchPrompt(subQuestion) {
  return `You are a financial research assistant. Please provide a comprehensive answer to the following financial question using current, accurate information. Include specific data, numbers, and recent developments when available. Focus on providing factual, well-sourced information.

Question: ${subQuestion}

Please structure your response to include:
1. A clear, direct answer to the question
2. Recent relevant data or statistics
3. Key factors or context that influence this topic
4. Any important recent developments or trends

Provide specific numbers, percentages, and dates when available. Ensure all information is current and accurate.`;
}

/**
 * Perform a search using Perplexity AI
 */
async function searchWithPerplexity(subQuestion) {
  try {
    console.log('[PERPLEXITY] Starting search for:', subQuestion);
    
    // Get the client
    const client = await getPerplexityClient();
    
    // Create the search prompt
    const prompt = createFinancialSearchPrompt(subQuestion);
    
    // Execute the search
    console.log('[PERPLEXITY] Executing search query...');
    const response = await client.invoke(prompt);
    
    console.log('[PERPLEXITY] ✅ Search completed successfully');
    console.log('[PERPLEXITY] Response length:', response.content.length);
    
    // Structure the response
    const searchResult = {
      query: subQuestion,
      source: 'perplexity',
      content: response.content,
      timestamp: new Date().toISOString(),
      confidence: 'high', // Perplexity provides real-time data
      searchId: `pplx_${Date.now()}`
    };
    
    return searchResult;
    
  } catch (error) {
    console.error('[PERPLEXITY] ❌ Search failed:', error.message);
    
    // Return error result
    return {
      query: subQuestion,
      source: 'perplexity',
      content: null,
      error: error.message,
      timestamp: new Date().toISOString(),
      confidence: 'failed',
      searchId: `pplx_error_${Date.now()}`
    };
  }
}

/**
 * Perform searches for multiple sub-questions
 */
async function searchMultipleQuestions(subQuestions) {
  try {
    console.log('[PERPLEXITY] Starting batch search for', subQuestions.length, 'questions');
    
    // Execute all searches in parallel
    const searchPromises = subQuestions.map(question => 
      searchWithPerplexity(question)
    );
    
    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);
    
    // Filter successful results
    const successfulResults = results.filter(result => !result.error);
    const failedResults = results.filter(result => result.error);
    
    return {
      successful: successfulResults,
      failed: failedResults,
      total: results.length,
      batchId: `batch_${Date.now()}`
    };
    
  } catch (error) {
    console.error('[PERPLEXITY] ❌ Batch search failed:', error.message);
    throw error;
  }
}

/**
 * Validate if a question is appropriate for Perplexity search
 */
function validateSearchQuestion(question) {
  if (!question || typeof question !== 'string') {
    return {
      isValid: false,
      error: 'Question must be a non-empty string'
    };
  }
  
  if (question.trim().length < 10) {
    return {
      isValid: false,
      error: 'Question is too short (minimum 10 characters)'
    };
  }
  
  if (question.length > 500) {
    return {
      isValid: false,
      error: 'Question is too long (maximum 500 characters)'
    };
  }
  
  return {
    isValid: true
  };
}

module.exports = {
  initializePerplexityClient,
  testPerplexityConnection,
  getPerplexityClient,
  searchWithPerplexity,
  searchMultipleQuestions,
  validateSearchQuestion
}; 