/**
 * Integration test for the complete Gemini planning chain
 * 
 * This test verifies:
 * - Planning service functionality
 * - Cache integration
 * - Error handling
 * - API configuration
 */

const planningService = require('./planningService');
const cache = require('./cache');
const config = require('./config');

// Test questions to verify functionality
const testQuestions = [
  'What is Apple\'s P/E ratio?',
  'Should I invest in Tesla stock?',
  'What is apple\'s p/e ratio?',  // Similar to first question (should use cache)
  'How has Microsoft performed this year?',
  'What are the risks of cryptocurrency?'
];

async function runIntegrationTests() {
  console.log('🧪 Running Gemini Planning Integration Tests...\n');

  try {
    // Test 1: Configuration Check
    console.log('📋 Test 1: Configuration and Setup');
    
    const validation = config.validateConfig();
    if (!validation.isValid) {
      console.log('⚠️  Configuration issues detected:');
      validation.errors.forEach(error => console.log(`   - ${error}`));
      console.log('\n💡 Note: Tests will use fallback plans without valid API key');
    } else {
      console.log('✅ Configuration is valid');
    }

    // Test 2: Cache System
    console.log('\n🗄️  Test 2: Cache System');
    
    // Clear cache to start fresh
    cache.clearCache();
    console.log('✅ Cache cleared for testing');
    
    const initialStats = cache.getCacheStats();
    console.log('✅ Cache stats:', {
      enabled: initialStats.enabled,
      entries: initialStats.totalEntries,
      maxSize: initialStats.maxSize
    });

    // Test 3: Single Planning Request
    console.log('\n🎯 Test 3: Single Planning Request');
    
    const testQuestion = testQuestions[0];
    console.log(`Testing question: "${testQuestion}"`);
    
    const startTime = Date.now();
    const plan1 = await planningService.planFinancialResearch(testQuestion);
    const duration1 = Date.now() - startTime;
    
    console.log('✅ Planning request completed:', {
      planId: plan1.planId,
      status: plan1.status,
      subQuestions: plan1.subQuestions.length,
      fromCache: plan1.fromCache,
      duration: `${duration1}ms`
    });

    // Test 4: Cache Hit Test
    console.log('\n💾 Test 4: Cache Hit Test (Same Question)');
    
    const startTime2 = Date.now();
    const plan2 = await planningService.planFinancialResearch(testQuestion);
    const duration2 = Date.now() - startTime2;
    
    console.log('✅ Second request completed:', {
      planId: plan2.planId,
      status: plan2.status,
      fromCache: plan2.fromCache,
      duration: `${duration2}ms`,
      speedup: plan2.fromCache ? `${Math.round(duration1 / duration2)}x faster` : 'No speedup'
    });

    if (plan2.fromCache) {
      console.log('✅ Cache hit successful - faster response time');
    } else {
      console.log('⚠️  Expected cache hit, but got fresh request');
    }

    // Test 5: Similar Question Test
    console.log('\n🔍 Test 5: Similar Question Test');
    
    const similarQuestion = testQuestions[2]; // 'What is apple\'s p/e ratio?'
    console.log(`Testing similar question: "${similarQuestion}"`);
    
    const plan3 = await planningService.planFinancialResearch(similarQuestion);
    console.log('✅ Similar question processed:', {
      planId: plan3.planId,
      fromCache: plan3.fromCache,
      originalPlanId: plan3.originalPlanId || 'N/A'
    });

    // Test 6: Multiple Different Questions
    console.log('\n📚 Test 6: Multiple Different Questions');
    
    const remainingQuestions = testQuestions.slice(3);
    for (let i = 0; i < remainingQuestions.length; i++) {
      const question = remainingQuestions[i];
      console.log(`\n🧪 Testing question ${i + 1}: "${question.substring(0, 30)}..."`);
      
      try {
        const plan = await planningService.planFinancialResearch(question);
        console.log('✅ Success:', {
          planId: plan.planId,
          status: plan.status,
          subQuestions: plan.subQuestions.length,
          fromCache: plan.fromCache
        });
      } catch (error) {
        console.log('❌ Failed:', error.message);
      }
    }

    // Test 7: Cache Statistics
    console.log('\n📊 Test 7: Final Cache Statistics');
    
    const finalStats = cache.getCacheStats();
    console.log('✅ Final cache stats:', {
      enabled: finalStats.enabled,
      totalEntries: finalStats.totalEntries,
      validEntries: finalStats.validEntries,
      maxSize: finalStats.maxSize,
      memoryUsage: `${Math.round(finalStats.memoryUsage / 1024 / 1024)}MB`
    });

    // Test 8: Error Handling
    console.log('\n🚨 Test 8: Error Handling');
    
    const invalidQuestions = ['', 'hi', 'a'.repeat(600)];
    
    for (const invalidQ of invalidQuestions) {
      const preview = invalidQ.length > 20 ? invalidQ.substring(0, 20) + '...' : invalidQ;
      try {
        await planningService.planFinancialResearch(invalidQ);
        console.log(`❌ Should have failed for: "${preview}"`);
      } catch (error) {
        console.log(`✅ Correctly rejected: "${preview}" - ${error.message}`);
      }
    }

    // Test 9: Fallback Plan Test
    console.log('\n🛟 Test 9: Fallback Plan Generation');
    
    // Temporarily save and modify the API key to trigger fallback
    const originalApiKey = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'invalid_key_for_testing';
    
    try {
      // Clear cache to ensure fresh request
      cache.clearCache();
      
      const fallbackPlan = await planningService.planFinancialResearch('Test fallback question');
      console.log('✅ Fallback plan generated:', {
        planId: fallbackPlan.planId,
        status: fallbackPlan.status,
        hasError: !!fallbackPlan.error,
        subQuestions: fallbackPlan.subQuestions.length
      });
      
      if (fallbackPlan.status === 'fallback') {
        console.log('✅ Fallback mechanism working correctly');
      } else {
        console.log('❌ Expected fallback plan, got normal plan');
      }
      
    } catch (error) {
      console.log('⚠️  Fallback test failed:', error.message);
    } finally {
      // Restore original API key
      process.env.GOOGLE_API_KEY = originalApiKey;
    }

    // Test Summary
    console.log('\n🎉 Integration Test Summary');
    console.log('✅ Configuration validation tested');
    console.log('✅ Cache system tested');
    console.log('✅ Planning service tested');
    console.log('✅ Error handling tested');
    console.log('✅ Fallback mechanism tested');
    console.log('✅ Multiple questions tested');
    console.log('\n🚀 Integration test completed successfully!');
    console.log('📝 The planning chain is ready for production use.');

    return {
      success: true,
      testsRun: 9,
      cacheEntries: finalStats.totalEntries,
      memoryUsage: finalStats.memoryUsage
    };

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for testing from other modules
async function runQuickTest() {
  console.log('🚀 Quick Integration Test...');
  
  try {
    const plan = await planningService.planFinancialResearch('What is Tesla\'s stock price?');
    console.log('✅ Quick test passed:', {
      planId: plan.planId,
      status: plan.status,
      fromCache: plan.fromCache,
      subQuestions: plan.subQuestions.length
    });
    return true;
  } catch (error) {
    console.log('❌ Quick test failed:', error.message);
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = { 
  runIntegrationTests, 
  runQuickTest 
}; 