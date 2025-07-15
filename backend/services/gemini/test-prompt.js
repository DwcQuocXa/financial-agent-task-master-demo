/**
 * Test file to verify the financial planning prompt template functionality
 */

const promptTemplate = require('./promptTemplate');

// Sample test questions for validation
const testQuestions = [
  // Valid financial questions
  'What is Apple\'s P/E ratio?',
  'Should I invest in Tesla stock?',
  'How has Microsoft\'s revenue grown over the past 5 years?',
  'What are the risks of investing in cryptocurrency?',
  'Compare Amazon and Google stock performance',
  
  // Edge cases
  'test',  // Too short
  'What is the weather today?',  // Non-financial
  '',  // Empty
  'a'.repeat(600),  // Too long
];

// Sample Gemini responses to test parsing
const sampleResponses = [
  // Valid JSON response
  `{
    "originalQuestion": "What is Apple's P/E ratio?",
    "subQuestions": [
      "What is Apple's current stock price and market capitalization?",
      "What are Apple's earnings per share (EPS) for the most recent quarter?",
      "How does Apple's P/E ratio compare to other tech companies?"
    ],
    "researchFocus": "Focus on current valuation metrics and peer comparison"
  }`,
  
  // Response with markdown code blocks
  `\`\`\`json
  {
    "originalQuestion": "Should I invest in Tesla?",
    "subQuestions": [
      "What are Tesla's recent financial results?",
      "What are the major risks facing Tesla?"
    ],
    "researchFocus": "Investment analysis"
  }
  \`\`\``,
  
  // Invalid JSON
  `{
    "originalQuestion": "Test question",
    "subQuestions": ["One question only"]
  }`,
  
  // Malformed JSON
  `{ "originalQuestion": "Test", invalid json }`,
];

async function runPromptTests() {
  console.log('🧪 Testing Financial Planning Prompt Template...\n');

  try {
    // Test 1: Question Validation
    console.log('📋 Test 1: Question Validation');
    
    for (const question of testQuestions) {
      const validation = promptTemplate.validateFinancialQuestion(question);
      const status = validation.isValid ? '✅' : '❌';
      const preview = question.length > 30 ? question.substring(0, 30) + '...' : question;
      
      console.log(`${status} "${preview}"`);
      if (!validation.isValid) {
        console.log(`   Error: ${validation.error}`);
      }
      if (validation.warning) {
        console.log(`   Warning: ${validation.warning}`);
      }
    }

    // Test 2: Prompt Creation
    console.log('\n🎯 Test 2: Prompt Creation');
    
    const validQuestion = 'What is Apple\'s P/E ratio?';
    try {
      const prompt = await promptTemplate.createFinancialPlanningPrompt(validQuestion);
      console.log('✅ Prompt created successfully');
      console.log(`📏 Prompt length: ${prompt.length} characters`);
      
      // Check if the question was properly inserted
      if (prompt.includes(validQuestion)) {
        console.log('✅ User question properly inserted into prompt');
      } else {
        console.log('❌ User question not found in prompt');
      }
      
      // Check for key template elements
      const keyElements = [
        'financial research assistant',
        'sub-questions',
        'JSON object',
        'originalQuestion',
        'subQuestions',
        'researchFocus'
      ];
      
      const missingElements = keyElements.filter(element => !prompt.toLowerCase().includes(element.toLowerCase()));
      if (missingElements.length === 0) {
        console.log('✅ All key template elements present');
      } else {
        console.log('❌ Missing template elements:', missingElements.join(', '));
      }
      
    } catch (error) {
      console.log('❌ Prompt creation failed:', error.message);
    }

    // Test 3: Response Parsing
    console.log('\n📄 Test 3: Response Parsing');
    
    for (let i = 0; i < sampleResponses.length; i++) {
      const response = sampleResponses[i];
      console.log(`\n🧪 Testing response ${i + 1}:`);
      
      try {
        const parsedPlan = promptTemplate.parseResearchPlan(response);
        console.log('✅ Response parsed successfully');
        console.log(`   Original Question: "${parsedPlan.originalQuestion}"`);
        console.log(`   Sub-questions: ${parsedPlan.subQuestions.length}`);
        console.log(`   Research Focus: "${parsedPlan.researchFocus}"`);
      } catch (error) {
        console.log('❌ Response parsing failed:', error.message);
      }
    }

    // Test 4: End-to-End Prompt Template Test
    console.log('\n🔄 Test 4: End-to-End Template Test');
    
    const testQuestion = 'How has Amazon\'s stock performed this year?';
    
    try {
      // Create prompt
      const prompt = await promptTemplate.createFinancialPlanningPrompt(testQuestion);
      console.log('✅ Step 1: Prompt created');
      
      // Since we can't actually call Gemini without a real API key,
      // we'll simulate a response that would come from Gemini
      const simulatedResponse = `{
        "originalQuestion": "${testQuestion}",
        "subQuestions": [
          "What was Amazon's stock price at the beginning of 2024?",
          "What is Amazon's current stock price and year-to-date performance?",
          "What major factors have influenced Amazon's stock price in 2024?"
        ],
        "researchFocus": "Focus on year-to-date stock performance analysis and key market drivers"
      }`;
      
      console.log('✅ Step 2: Simulated Gemini response');
      
      // Parse the response
      const parsedPlan = promptTemplate.parseResearchPlan(simulatedResponse);
      console.log('✅ Step 3: Response parsed successfully');
      
      console.log('\n📋 Complete Research Plan:');
      console.log(`   Original: "${parsedPlan.originalQuestion}"`);
      console.log(`   Sub-questions (${parsedPlan.subQuestions.length}):`);
      parsedPlan.subQuestions.forEach((q, index) => {
        console.log(`     ${index + 1}. ${q}`);
      });
      console.log(`   Focus: "${parsedPlan.researchFocus}"`);
      
    } catch (error) {
      console.log('❌ End-to-end test failed:', error.message);
    }

    console.log('\n🎉 All prompt template tests completed!');
    console.log('🚀 Ready to proceed with subtask 4.4 (Integration with chat endpoint)');

  } catch (error) {
    console.error('\n❌ Unexpected error during prompt testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runPromptTests().catch(console.error);
}

module.exports = { runPromptTests }; 