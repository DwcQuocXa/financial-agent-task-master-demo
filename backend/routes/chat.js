const express = require('express');
const router = express.Router();

// Import the comprehensive Financial Search Service
const { financialSearchService } = require('../services/search/index');

// Import the Gemini planning service
const { planFinancialResearch } = require('../services/gemini/planningService');

// Import the Gemini answering service
const { generateFinalAnswer, streamFinalAnswer } = require('../services/gemini/answeringService');

/**
 * Utility function to format Server-Sent Events (SSE) messages
 * @param {string} event - The event type (e.g., 'message', 'error', 'end')
 * @param {object|string} data - The data to send
 * @param {string} id - Optional event ID for tracking
 * @returns {string} Formatted SSE message
 */
function formatSSEMessage(event, data, id = null) {
  let message = '';
  
  if (id) {
    message += `id: ${id}\n`;
  }
  
  if (event) {
    message += `event: ${event}\n`;
  }
  
  // Convert data to string if it's an object
  const dataStr = typeof data === 'object' ? JSON.stringify(data) : data;
  message += `data: ${dataStr}\n\n`;
  
  return message;
}

/**
 * Utility function to stream a research plan with progress updates
 * @param {object} res - Express response object
 * @param {string} userQuestion - The user's original question
 * @param {object} researchPlan - The generated research plan
 */
async function streamResearchPlan(res, userQuestion, researchPlan) {
  const messageId = `msg_${Date.now()}`;
  
  try {
    // Send planning start event
    res.write(formatSSEMessage('planning_start', {
      id: messageId,
      message: 'Analyzing your question and generating research plan...',
      timestamp: new Date().toISOString()
    }, messageId));

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send the research plan
    res.write(formatSSEMessage('planning_complete', {
      id: messageId,
      researchPlan: researchPlan,
      timestamp: new Date().toISOString()
    }, messageId));

    // Create a formatted response message
    let responseMessage = `I've analyzed your question: "${userQuestion}"\n\n`;
    responseMessage += `Here's my research plan with ${researchPlan.subQuestions.length} key areas to investigate:\n\n`;
    
    researchPlan.subQuestions.forEach((question, index) => {
      responseMessage += `${index + 1}. ${question}\n\n`;
    });
    
    responseMessage += `Research Focus: ${researchPlan.researchFocus}\n\n`;
    responseMessage += `Note: This is the planning step. In the next phase, I would research each of these sub-questions and provide a comprehensive answer.`;

    // Stream the formatted response
    await streamMessageInChunks(res, responseMessage, 25, 60);

  } catch (error) {
    console.error('[CHAT-STREAM] Error streaming research plan:', error);
    res.write(formatSSEMessage('error', {
      error: 'Planning Error',
      message: 'An error occurred while generating the research plan',
      timestamp: new Date().toISOString()
    }, messageId));
    res.end();
  }
}

/**
 * Utility function to simulate streaming response with chunks
 * @param {object} res - Express response object
 * @param {string} fullMessage - The complete message to stream
 * @param {number} chunkSize - Size of each chunk (default: 10 characters)
 * @param {number} delay - Delay between chunks in milliseconds (default: 100ms)
 */
function streamMessageInChunks(res, fullMessage, chunkSize = 10, delay = 100) {
  return new Promise((resolve, reject) => {
    let currentIndex = 0;
    const messageId = `chunk_${Date.now()}`;
    
    // Send initial message start event
    res.write(formatSSEMessage('message_start', { 
      id: messageId, 
      totalLength: fullMessage.length,
      timestamp: new Date().toISOString()
    }, messageId));
    
    const sendChunk = () => {
      if (currentIndex >= fullMessage.length) {
        // Send completion event
        res.write(formatSSEMessage('message_end', { 
          id: messageId, 
          complete: true,
          timestamp: new Date().toISOString()
        }, messageId));
        
        res.end();
        resolve();
        return;
      }
      
      const chunk = fullMessage.substring(currentIndex, currentIndex + chunkSize);
      currentIndex += chunkSize;
      
      // Send chunk event
      res.write(formatSSEMessage('message_chunk', { 
        id: messageId,
        text: chunk,
        progress: Math.round((currentIndex / fullMessage.length) * 100),
        timestamp: new Date().toISOString()
      }, messageId));
      
      setTimeout(sendChunk, delay);
    };
    
    // Handle client disconnect
    res.on('close', () => {
      console.log(`[CHAT] SSE connection closed for message ${messageId}`);
      resolve();
    });
    
    res.on('error', (error) => {
      console.error(`[CHAT] SSE error for message ${messageId}:`, error);
      reject(error);
    });
    
    // Start sending chunks
    sendChunk();
  });
}

// POST /api/chat - Main chat endpoint (now with AI planning)
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    // Keep only: message received, workflow started, workflow completed, and errors
    console.log(`[CHAT] Received message from ${req.ip}`);

    // Basic validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log(`[CHAT] Validation failed for request from ${req.ip}: Empty or invalid message`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required and must be a non-empty string',
      });
    }

    try {
      // Execute the full financial search workflow (Plan → Search → Answer)
      console.log(`[CHAT] Starting full financial search workflow for: "${message}"`);
      
      // Initialize the search service if needed
      if (!financialSearchService.isInitialized) {
        await financialSearchService.initialize();
      }
      
      // Execute the complete search workflow
      const searchResults = await financialSearchService.executeFinancialSearch(message);
      
      // Generate the final answer using the search results
      console.log(`[CHAT] Generating final answer based on search results...`);
      const finalAnswer = await generateFinalAnswer(message, searchResults);
      
      const response = {
        id: `msg_${Date.now()}`,
        originalQuestion: message,
        answer: finalAnswer.answer,
        searchResultsUsed: finalAnswer.searchResultsUsed,
        workflow: {
          planId: searchResults.steps?.planning?.originalPlan?.planId,
          searchId: searchResults.searchId,
          answerId: finalAnswer.answerId
        },
        timestamp: new Date().toISOString(),
        status: 'success',
      };

      console.log(`[CHAT] Successfully completed full workflow from ${req.ip}:`, {
        responseId: response.id,
        searchId: searchResults.searchId,
        answerId: finalAnswer.answerId,
        searchResultsUsed: finalAnswer.searchResultsUsed
      });

      res.json(response);
      
    } catch (workflowError) {
      console.error(`[CHAT] Workflow error for ${req.ip}:`, workflowError.message);
      
      // Return a fallback response
      const fallbackResponse = {
        id: `msg_${Date.now()}`,
        originalQuestion: message,
        answer: `I apologize, but I encountered an issue while researching your question: "${message}". This could be due to API limitations or temporary service issues. Please try again in a moment.`,
        error: workflowError.message,
        timestamp: new Date().toISOString(),
        status: 'fallback',
      };
      
      res.json(fallbackResponse);
    }

  } catch (error) {
    console.error('[CHAT] Endpoint error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while processing your request',
    });
  }
});

// POST /api/chat/stream - Streaming chat endpoint with AI planning
router.post('/stream', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Log incoming streaming request
    console.log(`[CHAT-STREAM] Received streaming request from ${req.ip}:`, {
      messageLength: message?.length || 0,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    // Basic validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log(`[CHAT-STREAM] Validation failed for request from ${req.ip}: Empty or invalid message`);
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required and must be a non-empty string',
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Keep connection alive
    res.status(200);

    try {
      console.log(`[CHAT-STREAM] Starting AI planning for message from ${req.ip}`);
      
      // Generate research plan using Gemini
      const researchPlan = await planFinancialResearch(message);
      
      console.log(`[CHAT-STREAM] Successfully generated plan for ${req.ip}:`, {
        planId: researchPlan.planId,
        subQuestionCount: researchPlan.subQuestions.length,
        status: researchPlan.status
      });
      
      // Stream the research plan
      await streamResearchPlan(res, message, researchPlan);
      
      console.log(`[CHAT-STREAM] Completed streaming research plan for ${req.ip}`);
      
    } catch (planningError) {
      console.error(`[CHAT-STREAM] Planning error for ${req.ip}:`, planningError.message);
      
      // Stream fallback message
      const fallbackMessage = `I received your question: "${message}"\n\nUnfortunately, I encountered an issue generating a research plan: ${planningError.message}\n\nThis could be due to:\n- Missing or invalid Google API key\n- Network connectivity issues\n- API rate limiting\n\nPlease check your configuration and try again.`;
      
      // Send error event
      res.write(formatSSEMessage('planning_error', {
        error: planningError.message,
        message: 'Failed to generate research plan',
        timestamp: new Date().toISOString()
      }));
      
      // Stream fallback message
      await streamMessageInChunks(res, fallbackMessage, 20, 80);
    }
    
  } catch (error) {
    console.error('[CHAT-STREAM] Error processing streaming request:', error);
    
    // If headers haven't been sent yet, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An error occurred while processing your streaming request',
      });
    } else {
      // If we're already streaming, send error as SSE event
      res.write(formatSSEMessage('error', {
        error: 'Internal Server Error',
        message: 'An error occurred during streaming',
        timestamp: new Date().toISOString()
      }));
      res.end();
    }
  }
});

// GET /api/chat/status - Chat service status
router.get('/status', async (req, res) => {
  try {
    const searchServiceStatus = financialSearchService.getStatus();
    
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      features: {
        basicChat: true,
        streaming: true,
        aiPlanning: searchServiceStatus.config.enablePlanning,
        searchIntegration: searchServiceStatus.config.enableSearch,
        resultsProcessing: searchServiceStatus.config.enableResultsProcessing,
        perplexitySearch: true,
        firecrawlExtraction: true
      },
      searchService: {
        initialized: searchServiceStatus.initialized,
        config: searchServiceStatus.config
      }
    });
  } catch (error) {
    console.error('[CHAT] Error getting status:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router; 