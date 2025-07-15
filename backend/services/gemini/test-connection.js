/**
 * Test file to verify Gemini API connection and configuration
 */

const planningService = require('./planningService');
const config = require('./config');

async function runConnectionTests() {
  console.log('🧪 Testing Gemini API Configuration and Connection...\n');

  try {
    // Test 1: Configuration validation
    console.log('📋 Test 1: Configuration Validation');
    const validation = config.validateConfig();
    
    if (validation.isValid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration errors:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      
      console.log('\n💡 Setup Instructions:');
      console.log('1. Create a .env file in the backend directory');
      console.log('2. Add the following variables:');
      console.log('   GOOGLE_API_KEY=your_actual_api_key_here');
      console.log('   GEMINI_MODEL=gemini-2.0-flash');
      console.log('   GEMINI_TEMPERATURE=0.7');
      console.log('   GEMINI_MAX_TOKENS=2048');
      console.log('3. Get your API key from: https://aistudio.google.com/app/apikey');
      console.log('\n⚠️  Cannot proceed with connection tests without valid configuration');
      return;
    }

    // Test 2: Model initialization
    console.log('\n🤖 Test 2: Model Initialization');
    try {
      const model = await planningService.initializeGeminiModel();
      console.log('✅ Gemini model initialized successfully');
    } catch (error) {
      console.log('❌ Model initialization failed:', error.message);
      return;
    }

    // Test 3: Connection test
    console.log('\n🌐 Test 3: API Connection Test');
    const connectionResult = await planningService.testGeminiConnection();
    
    if (connectionResult.success) {
      console.log('✅ API connection successful');
      console.log('📄 Response:', connectionResult.response);
    } else {
      console.log('❌ API connection failed:', connectionResult.error);
      
      console.log('\n💡 Troubleshooting:');
      console.log('1. Verify your GOOGLE_API_KEY is correct');
      console.log('2. Check your internet connection');
      console.log('3. Ensure the API key has the necessary permissions');
      console.log('4. Check Google AI Studio for quota limits');
      return;
    }

    // Test 4: Planning service basic test
    console.log('\n📝 Test 4: Planning Service Basic Test');
    try {
      const testQuestion = 'What is Apple\'s current stock price?';
      const plan = await planningService.planFinancialResearch(testQuestion);
      console.log('✅ Planning service working');
      console.log('📋 Generated plan:', {
        planId: plan.planId,
        originalQuestion: plan.originalQuestion,
        subQuestionsCount: plan.subQuestions.length,
        status: plan.status
      });
    } catch (error) {
      console.log('❌ Planning service failed:', error.message);
    }

    console.log('\n🎉 All Gemini configuration tests completed!');
    console.log('🚀 Ready to proceed with subtask 4.3 (Prompt Template)');

  } catch (error) {
    console.error('\n❌ Unexpected error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the tests
if (require.main === module) {
  runConnectionTests().catch(console.error);
}

module.exports = { runConnectionTests }; 