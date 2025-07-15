/**
 * Financial Planning Prompt Template
 * 
 * This module contains the prompt templates and logic for generating
 * structured financial research plans using Gemini.
 */

const { PromptTemplate } = require('@langchain/core/prompts');

// Main prompt template for financial research planning
const FINANCIAL_PLANNING_PROMPT = `You are a financial research assistant helping to break down complex financial questions into targeted sub-questions for comprehensive research.

Your task is to analyze the user's financial question and generate approximately 3 focused sub-questions that will help gather all necessary information to provide a complete answer.

**Context:**
- Focus on factual, data-driven questions that can be researched
- Prioritize current/recent financial data and metrics
- Consider multiple perspectives (company fundamentals, market context, industry comparisons)
- Ensure questions are specific enough to yield actionable research results

**Guidelines:**
1. Generate 2-4 sub-questions (aim for 3 when possible)
2. Each sub-question should address a different aspect of the original question
3. Questions should be specific, measurable, and researchable
4. Include relevant timeframes when appropriate (e.g., "current", "2024", "recent quarter")
5. Consider both quantitative metrics and qualitative factors when relevant

**Output Format:**
Respond with a JSON object containing:
- originalQuestion: The user's original question
- subQuestions: Array of 2-4 focused sub-questions
- researchFocus: Brief description of the research strategy

**Examples:**

User Question: "What is Apple's P/E ratio?"
{{
  "originalQuestion": "What is Apple's P/E ratio?",
  "subQuestions": [
    "What is Apple's current stock price and market capitalization?",
    "What are Apple's earnings per share (EPS) for the most recent quarter and trailing twelve months?",
    "How does Apple's P/E ratio compare to other major technology companies?"
  ],
  "researchFocus": "Focus on current valuation metrics and peer comparison"
}}

User Question: "Should I invest in Tesla stock?"
{{
  "originalQuestion": "Should I invest in Tesla stock?",
  "subQuestions": [
    "What are Tesla's current financial performance metrics and recent quarterly results?",
    "What are the major risks and growth opportunities facing Tesla in 2024?",
    "How do analysts rate Tesla stock and what are the price targets?"
  ],
  "researchFocus": "Focus on comprehensive investment analysis including financials, risks, and market sentiment"
}}

**User Question:** {user_question}

Please analyze this question and generate a structured research plan following the format above.`;

// Create the LangChain PromptTemplate
const financialPlanningTemplate = new PromptTemplate({
  template: FINANCIAL_PLANNING_PROMPT,
  inputVariables: ['user_question']
});

/**
 * Validates that a user question is suitable for financial research
 * @param {string} question - The user's question
 * @returns {Object} Validation result
 */
function validateFinancialQuestion(question) {
  if (!question || typeof question !== 'string') {
    return {
      isValid: false,
      error: 'Question must be a non-empty string'
    };
  }

  const cleanQuestion = question.trim();
  
  if (cleanQuestion.length < 5) {
    return {
      isValid: false,
      error: 'Question is too short (minimum 5 characters)'
    };
  }

  if (cleanQuestion.length > 500) {
    return {
      isValid: false,
      error: 'Question is too long (maximum 500 characters)'
    };
  }

  // Check for financial-related keywords
  const financialKeywords = [
    'stock', 'price', 'ratio', 'earnings', 'revenue', 'profit', 'investment', 
    'market', 'company', 'financial', 'valuation', 'dividend', 'growth',
    'analysis', 'performance', 'cash flow', 'debt', 'equity', 'asset',
    'return', 'risk', 'portfolio', 'sector', 'industry', 'economy'
  ];

  const hasFinancialKeywords = financialKeywords.some(keyword => 
    cleanQuestion.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasFinancialKeywords) {
    return {
      isValid: true,
      warning: 'Question may not be financial-related. Consider rephrasing for better results.'
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Formats the prompt with the user's question
 * @param {string} userQuestion - The user's financial question
 * @returns {Promise<string>} Formatted prompt string
 */
async function createFinancialPlanningPrompt(userQuestion) {
  try {
    // Validate the question
    const validation = validateFinancialQuestion(userQuestion);
    if (!validation.isValid) {
      throw new Error(`Invalid question: ${validation.error}`);
    }

    // Format the prompt
    const formattedPrompt = await financialPlanningTemplate.format({
      user_question: userQuestion.trim()
    });

    return formattedPrompt;

  } catch (error) {
    console.error('[PROMPT] ❌ Error creating prompt:', error.message);
    throw error;
  }
}

/**
 * Parses the JSON response from Gemini and validates the structure
 * @param {string} response - Raw response from Gemini
 * @returns {Object} Parsed and validated research plan
 */
function parseResearchPlan(response) {
  try {
    // Clean the response (remove code blocks if present)
    let cleanResponse = response.trim();
    
    // Remove markdown code blocks
    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Parse JSON
    const parsedPlan = JSON.parse(cleanResponse);
    
    // Validate structure
    const requiredFields = ['originalQuestion', 'subQuestions', 'researchFocus'];
    const missingFields = requiredFields.filter(field => !parsedPlan[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Validate sub-questions
    if (!Array.isArray(parsedPlan.subQuestions)) {
      throw new Error('subQuestions must be an array');
    }
    
    if (parsedPlan.subQuestions.length < 2 || parsedPlan.subQuestions.length > 4) {
      throw new Error('Must have 2-4 sub-questions');
    }
    
    // Ensure all sub-questions are strings
    const invalidSubQuestions = parsedPlan.subQuestions.filter(q => typeof q !== 'string' || q.trim().length === 0);
    if (invalidSubQuestions.length > 0) {
      throw new Error('All sub-questions must be non-empty strings');
    }
    
    console.log('[PROMPT] ✅ Research plan parsed and validated successfully');
    return parsedPlan;
    
  } catch (error) {
    console.error('[PROMPT] ❌ Error parsing research plan:', error.message);
    console.error('[PROMPT] Raw response:', response);
    throw new Error(`Failed to parse research plan: ${error.message}`);
  }
}

module.exports = {
  financialPlanningTemplate,
  createFinancialPlanningPrompt,
  validateFinancialQuestion,
  parseResearchPlan,
  FINANCIAL_PLANNING_PROMPT
}; 