/**
 * Gemini Answering Service
 * 
 * This service handles the final answering step of the financial agent.
 * It uses Google Gemini to synthesize search results into comprehensive answers with citations.
 */

const { getGeminiModel } = require('./planningService');

/**
 * Create a comprehensive prompt for synthesizing search results
 */
function createAnsweringPrompt(userQuestion, searchResults) {
  const prompt = `You are a financial research assistant. Your task is to provide a comprehensive, accurate answer to the user's question based on the search results provided.

## User Question:
${userQuestion}

## Search Results:
${formatSearchResults(searchResults)}

## Instructions:
1. Provide a comprehensive answer that directly addresses the user's question
2. Use ONLY the information from the search results provided
3. Include specific citations using [Source: X] format for each key fact
4. If the search results don't contain enough information, clearly state what is missing
5. Organize your response with clear sections if appropriate
6. Include relevant numbers, dates, and specific details when available
7. If there are conflicting information in the sources, acknowledge and explain the discrepancy

## Answer Format:
- Start with a direct answer to the question
- Provide supporting details with citations
- End with a brief summary if the answer is long
- Use clear, professional language suitable for financial topics

Please provide your answer now:`;

  return prompt;
}

/**
 * Format search results for inclusion in the prompt
 */
function formatSearchResults(searchResults) {
  console.log('[ANSWERING] Formatting search results for prompt...');
  
  // Safe logging to handle circular references
  try {
    const safeSearchResults = {
      search: searchResults?.search,
      results: {
        total: searchResults?.results?.total,
        items: searchResults?.results?.items ? `Array(${searchResults.results.items.length})` : undefined,
        allResults: searchResults?.results?.allResults ? `Array(${searchResults.results.allResults.length})` : undefined
      },
      metadata: searchResults?.metadata
    };
    console.log('[ANSWERING] Search results structure:', JSON.stringify(safeSearchResults, null, 2));
  } catch (error) {
    console.log('[ANSWERING] Search results structure: [Unable to stringify - contains circular references]');
  }
  
  if (!searchResults || !searchResults.results) {
    console.log('[ANSWERING] No search results available');
    return "No search results available.";
  }

  let formattedResults = "";
  let resultItems = [];
  
  // Handle different result structures
  if (searchResults.results.items && Array.isArray(searchResults.results.items)) {
    // Processed results from resultsProcessor
    resultItems = searchResults.results.items;
    console.log('[ANSWERING] Using processed results:', resultItems.length);
  } else if (searchResults.results.allResults && Array.isArray(searchResults.results.allResults)) {
    // Fallback results
    resultItems = searchResults.results.allResults;
    console.log('[ANSWERING] Using fallback results:', resultItems.length);
  } else {
    console.log('[ANSWERING] No valid result items found');
    return "No valid search results available.";
  }
  
  if (resultItems.length === 0) {
    console.log('[ANSWERING] Empty result items array');
    return "No search results found.";
  }
  
  resultItems.forEach((result, index) => {
    formattedResults += `\n### Search Result ${index + 1}:\n`;
    
    // Handle processed results (from resultsProcessor)
    if (result.title && result.content) {
      formattedResults += `**Title:** ${result.title}\n`;
      formattedResults += `**Content:** ${result.content}\n`;
      if (result.sourceUrl) {
        formattedResults += `**Source:** ${result.sourceUrl}\n`;
      }
      if (result.source) {
        formattedResults += `**Provider:** ${result.source}\n`;
      }
      if (result.relevanceScore) {
        formattedResults += `**Relevance Score:** ${result.relevanceScore}\n`;
      }
    }
    // Handle fallback results structure
    else if (result.data) {
      formattedResults += `**Source:** ${result.source || 'Unknown'}\n`;
      
      if (result.data.content) {
        formattedResults += `**Content:** ${result.data.content}\n`;
      }
      if (result.data.citations && result.data.citations.length > 0) {
        formattedResults += `**Citations:** ${result.data.citations.join(', ')}\n`;
      }
      if (result.data.sources && result.data.sources.length > 0) {
        formattedResults += `**Sources:** ${result.data.sources.join(', ')}\n`;
      }
    }
    // Handle direct content structure
    else if (result.content) {
      formattedResults += `**Source:** ${result.source || 'Unknown'}\n`;
      formattedResults += `**Content:** ${result.content}\n`;
      if (result.url) {
        formattedResults += `**URL:** ${result.url}\n`;
      }
    }
    
    formattedResults += "\n";
  });
  
  if (formattedResults.trim() === "") {
    console.log('[ANSWERING] No formatted results generated');
    return "No processable search results available.";
  }
  
  console.log('[ANSWERING] ✅ Formatted results generated:', formattedResults.length, 'characters');
  return formattedResults;
}

/**
 * Generate final answer using Gemini
 */
async function generateFinalAnswer(userQuestion, searchResults) {
  try {
    console.log('[ANSWERING] Generating final answer for:', userQuestion);
    
    // Get the Gemini model
    const model = await getGeminiModel();
    
    // Create the prompt
    const prompt = createAnsweringPrompt(userQuestion, searchResults);
    
    // Generate response from Gemini
    console.log('[ANSWERING] Sending request to Gemini...');
    const response = await model.invoke(prompt);
    
    // Structure the final answer
    const searchResultsUsed = searchResults.results ? 
      (searchResults.results.items?.length || searchResults.results.allResults?.length || searchResults.results.total || 0) : 0;
    
    const finalAnswer = {
      answerId: `answer_${Date.now()}`,
      originalQuestion: userQuestion,
      answer: response.content,
      searchResultsUsed: searchResultsUsed,
      timestamp: new Date().toISOString(),
      status: 'completed',
      model: 'gemini-2.0-flash'
    };
    
    return finalAnswer;
    
  } catch (error) {
    console.error('[ANSWERING] ❌ Error generating final answer:', error.message);
    
    // Return a fallback answer
    const fallbackSearchResultsUsed = searchResults.results ? 
      (searchResults.results.items?.length || searchResults.results.allResults?.length || searchResults.results.total || 0) : 0;
    
    const fallbackAnswer = {
      answerId: `fallback_answer_${Date.now()}`,
      originalQuestion: userQuestion,
      answer: `I apologize, but I encountered an error while generating a comprehensive answer to your question: "${userQuestion}". This could be due to technical issues with the AI model. Please try again, or contact support if the issue persists.`,
      searchResultsUsed: fallbackSearchResultsUsed,
      timestamp: new Date().toISOString(),
      status: 'fallback',
      error: error.message
    };
    
    console.log('[ANSWERING] ⚠️  Using fallback answer due to error');
    return fallbackAnswer;
  }
}

/**
 * Stream the final answer in chunks (for SSE streaming)
 */
async function streamFinalAnswer(userQuestion, searchResults, onChunk) {
  try {
    console.log('[ANSWERING] Starting streaming answer generation...');
    
    const finalAnswer = await generateFinalAnswer(userQuestion, searchResults);
    
    if (!onChunk || typeof onChunk !== 'function') {
      console.log('[ANSWERING] No streaming callback provided, returning full answer');
      return finalAnswer;
    }
    
    // Stream the answer in chunks
    const answer = finalAnswer.answer;
    const chunkSize = 25; // characters per chunk
    const delay = 50; // milliseconds between chunks
    
    console.log('[ANSWERING] Streaming answer in chunks...');
    
    for (let i = 0; i < answer.length; i += chunkSize) {
      const chunk = answer.substring(i, i + chunkSize);
      const progress = Math.round(((i + chunkSize) / answer.length) * 100);
      
      await onChunk({
        chunk: chunk,
        progress: Math.min(progress, 100),
        isComplete: i + chunkSize >= answer.length,
        answerId: finalAnswer.answerId,
        timestamp: new Date().toISOString()
      });
      
      // Add delay between chunks
      if (i + chunkSize < answer.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log('[ANSWERING] ✅ Streaming completed');
    return finalAnswer;
    
  } catch (error) {
    console.error('[ANSWERING] ❌ Error streaming answer:', error.message);
    
    if (onChunk) {
      await onChunk({
        chunk: `Error generating answer: ${error.message}`,
        progress: 100,
        isComplete: true,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    throw error;
  }
}

module.exports = {
  createAnsweringPrompt,
  formatSearchResults,
  generateFinalAnswer,
  streamFinalAnswer
}; 