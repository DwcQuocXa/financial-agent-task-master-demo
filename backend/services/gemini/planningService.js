/**
 * Gemini Planning Service
 * 
 * This service handles the planning step of the financial agent.
 * It uses Google Gemini to generate research sub-questions based on user input.
 */

const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { getGeminiConfig, logConfigStatus } = require('./config');
const { 
  createFinancialPlanningPrompt, 
  parseResearchPlan, 
  validateFinancialQuestion 
} = require('./promptTemplate');

let geminiModel = null;

// Initialize the Gemini model with proper configuration
async function initializeGeminiModel() {
  try {
    console.log('[PLANNING] Initializing Gemini model...');
    
    // Log configuration status
    logConfigStatus();
    
    // Get validated configuration
    const config = getGeminiConfig();
    
    // Initialize the Gemini model
    geminiModel = new ChatGoogleGenerativeAI({
      apiKey: config.googleApiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
    
    console.log('[PLANNING] ✅ Gemini model initialized successfully');
    console.log(`[PLANNING] Using model: ${config.model}`);
    
    return geminiModel;
    
  } catch (error) {
    console.error('[PLANNING] ❌ Failed to initialize Gemini model:', error.message);
    throw new Error(`Gemini initialization failed: ${error.message}`);
  }
}

// Test the Gemini connection with a simple query
async function testGeminiConnection() {
  try {
    console.log('[PLANNING] Testing Gemini connection...');
    
    if (!geminiModel) {
      await initializeGeminiModel();
    }
    
    // Simple test query
    const testResponse = await geminiModel.invoke('Say "Connection successful" if you can read this.');
    
    console.log('[PLANNING] ✅ Gemini connection test successful');
    console.log('[PLANNING] Test response:', testResponse.content);
    
    return {
      success: true,
      response: testResponse.content
    };
    
  } catch (error) {
    console.error('[PLANNING] ❌ Gemini connection test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Get the initialized model (initializes if needed)
async function getGeminiModel() {
  if (!geminiModel) {
    await initializeGeminiModel();
  }
  return geminiModel;
}

// Generate the research plan using Gemini and the prompt template
async function generateResearchPlan(userQuestion) {
  try {
    console.log('[PLANNING] Generating research plan for:', userQuestion);
    
    // Ensure model is initialized
    const model = await getGeminiModel();
    
    // Create the financial planning prompt
    const prompt = await createFinancialPlanningPrompt(userQuestion);
    console.log('[PLANNING] ✅ Prompt created successfully');
    
    // Generate response from Gemini
    console.log('[PLANNING] Sending request to Gemini...');
    const response = await model.invoke(prompt);
    
    console.log('[PLANNING] ✅ Received response from Gemini');
    console.log('[PLANNING] Raw response length:', response.content.length);
    
    // Parse and validate the response
    const parsedPlan = parseResearchPlan(response.content);
    
    // Add metadata
    const enrichedPlan = {
      ...parsedPlan,
      planId: `plan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'completed',
      model: 'gemini-2.0-flash',
      subQuestionCount: parsedPlan.subQuestions.length
    };
    
    console.log('[PLANNING] ✅ Research plan generated successfully');
    console.log('[PLANNING] Plan ID:', enrichedPlan.planId);
    console.log('[PLANNING] Sub-questions generated:', enrichedPlan.subQuestionCount);
    
    return enrichedPlan;
    
  } catch (error) {
    console.error('[PLANNING] ❌ Error generating research plan:', error.message);
    
    // Return a fallback plan in case of errors
    const fallbackPlan = {
      originalQuestion: userQuestion,
      subQuestions: [
        `Research the basic information about: ${userQuestion}`,
        `Find recent data and metrics related to: ${userQuestion}`,
        `Analyze the context and implications of: ${userQuestion}`
      ],
      researchFocus: 'General research approach due to planning system error',
      planId: `fallback_plan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'fallback',
      error: error.message,
      subQuestionCount: 3
    };
    
    console.log('[PLANNING] ⚠️  Using fallback plan due to error');
    return fallbackPlan;
  }
}

// Main planning function that will be called from the chat endpoint
async function planFinancialResearch(userQuestion) {
  try {
    console.log('[PLANNING] Starting planning process for:', userQuestion);
    
    // Validate input using the prompt template validation
    const validation = validateFinancialQuestion(userQuestion);
    if (!validation.isValid) {
      throw new Error(`Invalid question: ${validation.error}`);
    }
    
    // Log warning if present
    if (validation.warning) {
      console.log('[PLANNING] Warning:', validation.warning);
    }
    
    // Generate research plan
    const plan = await generateResearchPlan(userQuestion);
    
    console.log('[PLANNING] ✅ Planning process completed successfully');
    console.log('[PLANNING] Plan status:', plan.status);
    
    return plan;
    
  } catch (error) {
    console.error('[PLANNING] ❌ Error in planning process:', error.message);
    throw error;
  }
}

module.exports = {
  initializeGeminiModel,
  testGeminiConnection,
  getGeminiModel,
  generateResearchPlan,
  validateFinancialQuestion,
  planFinancialResearch
}; 