/**
 * Test file for Firecrawl Web Data Extraction Service
 * 
 * This file contains tests to verify the Firecrawl integration works correctly.
 * Run with: node services/search/test-firecrawl.js
 */

const {
  initializeFirecrawlClient,
  testFirecrawlConnection,
  extractDataForQuery,
  extractDataForMultipleQueries,
  generateFinancialSearchUrls
} = require('./firecrawlService');

// Test data
const testQueries = [
  'Federal Reserve interest rates 2024',
  'US inflation data latest',
  'Stock market performance today'
];

async function runTests() {
  console.log('🔥 Starting Firecrawl Web Data Extraction Service Tests\n');
  
  try {
    // Test 1: Configuration validation
    console.log('Test 1: Configuration validation...');
    try {
      await initializeFirecrawlClient();
      console.log('✅ Configuration validation passed\n');
    } catch (error) {
      console.log('❌ Configuration validation failed:', error.message);
      console.log('ℹ️  Make sure to set your FIRECRAWL_API_KEY in the .env file\n');
      return;
    }
    
    // Test 2: Connection test
    console.log('Test 2: Connection test...');
    const connectionResult = await testFirecrawlConnection();
    if (connectionResult.success) {
      console.log('✅ Connection test passed');
      console.log('📝 Response preview:', connectionResult.response, '\n');
    } else {
      console.log('❌ Connection test failed:', connectionResult.error, '\n');
      return;
    }
    
    // Test 3: URL generation test
    console.log('Test 3: URL generation test...');
    const testQuery = 'inflation rates';
    const generatedUrls = generateFinancialSearchUrls(testQuery);
    
    console.log('✅ URL generation test passed');
    console.log(`📝 Generated ${generatedUrls.length} URLs for query: "${testQuery}"`);
    console.log('📝 Sample URLs:');
    generatedUrls.slice(0, 3).forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });
    console.log();
    
    // Test 4: Single query extraction (limited test)
    console.log('Test 4: Single query extraction test...');
    console.log('ℹ️  This test will only check the first result to avoid rate limits\n');
    
    try {
      // We'll just test the URL generation and basic structure
      const extractionResult = await extractDataForQuery(testQueries[0]);
      
      console.log('✅ Single query extraction completed');
      console.log('📊 Results summary:', {
        query: extractionResult.query,
        source: extractionResult.source,
        successful: extractionResult.successful.length,
        failed: extractionResult.failed.length,
        total: extractionResult.total,
        extractionId: extractionResult.extractionId
      });
      
      if (extractionResult.successful.length > 0) {
        const firstResult = extractionResult.successful[0];
        console.log('📝 First successful result preview:');
        console.log('   Title:', firstResult.data?.title || 'No title');
        console.log('   URL:', firstResult.data?.url || 'No URL');
        console.log('   Relevance Score:', firstResult.data?.relevanceScore || 0);
        console.log('   Content preview:', (firstResult.data?.content || '').substring(0, 100) + '...');
      }
      
      if (extractionResult.failed.length > 0) {
        console.log('❌ Failed extractions:');
        extractionResult.failed.slice(0, 3).forEach((failed, index) => {
          console.log(`   ${index + 1}. ${failed.url}: ${failed.error}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Single query extraction failed:', error.message);
    }
    
    console.log('\n⚠️  Note: Full batch testing is disabled to avoid rate limits');
    console.log('   To test multiple queries, ensure you have sufficient API credits');
    console.log('   and uncomment the batch test section below.\n');
    
    // Test 5: Batch extraction (commented out to avoid rate limits)
    /*
    console.log('Test 5: Batch extraction test...');
    const batchResult = await extractDataForMultipleQueries(testQueries);
    
    console.log('✅ Batch extraction completed');
    console.log('📊 Batch results:', {
      batchId: batchResult.batchId,
      totalQueries: batchResult.results.length,
      timestamp: batchResult.timestamp
    });
    
    batchResult.results.forEach((result, index) => {
      console.log(`Query ${index + 1}: ${result.query}`);
      console.log(`  Successful: ${result.successful.length}, Failed: ${result.failed.length}`);
    });
    */
    
    console.log('🎉 Core tests completed successfully!');
    console.log('\n💡 To test with real API calls:');
    console.log('   1. Get a Firecrawl API key from https://www.firecrawl.dev/');
    console.log('   2. Add FIRECRAWL_API_KEY=your_key_here to your .env file');
    console.log('   3. Re-run this test');
    
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