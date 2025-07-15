/**
 * Test file for Perplexity AI Search Service
 * 
 * This file contains tests to verify the Perplexity integration works correctly.
 * Run with: node services/search/test-perplexity.js
 */

const {
  initializePerplexityClient,
  testPerplexityConnection,
  searchWithPerplexity,
  searchMultipleQuestions,
  validateSearchQuestion
} = require('./perplexityService');

// Test data
const testQuestions = [
  'What is the current Federal Reserve interest rate?',
  'How is the US stock market performing today?',
  'What are the latest inflation rates in the United States?'
];

async function runTests() {
  console.log('🧪 Starting Perplexity AI Search Service Tests\n');
  
  try {
    // Test 1: Configuration validation
    console.log('Test 1: Configuration validation...');
    try {
      await initializePerplexityClient();
      console.log('✅ Configuration validation passed\n');
    } catch (error) {
      console.log('❌ Configuration validation failed:', error.message);
      console.log('ℹ️  Make sure to set your PERPLEXITY_API_KEY in the .env file\n');
      return;
    }
    
    // Test 2: Connection test
    console.log('Test 2: Connection test...');
    const connectionResult = await testPerplexityConnection();
    if (connectionResult.success) {
      console.log('✅ Connection test passed');
      console.log('📝 Response:', connectionResult.response, '\n');
    } else {
      console.log('❌ Connection test failed:', connectionResult.error, '\n');
      return;
    }
    
    // Test 3: Question validation
    console.log('Test 3: Question validation...');
    const validationTests = [
      { question: 'What is GDP?', shouldPass: true },
      { question: 'Short', shouldPass: false },
      { question: '', shouldPass: false },
      { question: 'A'.repeat(600), shouldPass: false }
    ];
    
    let validationPassed = true;
    validationTests.forEach(test => {
      const result = validateSearchQuestion(test.question);
      if (result.isValid !== test.shouldPass) {
        console.log(`❌ Validation failed for: "${test.question.substring(0, 50)}..."`);
        validationPassed = false;
      }
    });
    
    if (validationPassed) {
      console.log('✅ Question validation tests passed\n');
    } else {
      console.log('❌ Question validation tests failed\n');
    }
    
    // Test 4: Single search
    console.log('Test 4: Single search test...');
    const singleSearchResult = await searchWithPerplexity(testQuestions[0]);
    if (singleSearchResult.error) {
      console.log('❌ Single search failed:', singleSearchResult.error);
    } else {
      console.log('✅ Single search passed');
      console.log('📝 Query:', singleSearchResult.query);
      console.log('📝 Response preview:', singleSearchResult.content.substring(0, 200) + '...');
      console.log('📝 Search ID:', singleSearchResult.searchId, '\n');
    }
    
    // Test 5: Batch search (if single search worked)
    if (!singleSearchResult.error) {
      console.log('Test 5: Batch search test...');
      const batchResult = await searchMultipleQuestions(testQuestions);
      console.log('✅ Batch search completed');
      console.log('📊 Results:', {
        successful: batchResult.successful.length,
        failed: batchResult.failed.length,
        total: batchResult.total
      });
      
      if (batchResult.successful.length > 0) {
        console.log('📝 First successful result preview:');
        const firstResult = batchResult.successful[0];
        console.log('   Query:', firstResult.query);
        console.log('   Response:', firstResult.content.substring(0, 150) + '...');
      }
      
      if (batchResult.failed.length > 0) {
        console.log('❌ Failed searches:');
        batchResult.failed.forEach(failed => {
          console.log('   -', failed.query, ':', failed.error);
        });
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 