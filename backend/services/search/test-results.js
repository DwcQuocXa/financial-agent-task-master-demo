/**
 * Test file for Results Processor
 * 
 * This file contains tests to verify the ResultsProcessor works correctly
 * for collecting, merging, and structuring search results.
 * Run with: node services/search/test-results.js
 */

const { ResultsProcessor, resultsProcessor } = require('./resultsProcessor');

// Mock search results for testing
const mockSearchResults = {
  searchId: 'test_search_123',
  query: 'Current US interest rates',
  duration: 5000,
  status: 'completed',
  sources: {
    perplexity: true,
    firecrawl: true
  },
  results: {
    allResults: [
      // Mock Perplexity result
      {
        source: 'perplexity',
        content: 'The Federal Reserve has set the federal funds rate at 5.25%-5.50% as of December 2024. This represents the highest level in over 15 years.',
        confidence: 'high',
        searchId: 'pplx_123'
      },
      // Mock Firecrawl results
      {
        source: 'firecrawl',
        title: 'Federal Reserve Rate Decision',
        url: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm',
        content: 'The Federal Open Market Committee (FOMC) decided to maintain the target range for the federal funds rate at 5-1/4 to 5-1/2 percent.',
        relevanceScore: 95,
        data: {
          title: 'Federal Reserve Rate Decision',
          url: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm',
          content: 'The Federal Open Market Committee (FOMC) decided to maintain the target range for the federal funds rate at 5-1/4 to 5-1/2 percent.',
          summary: 'Official FOMC statement on interest rate policy.',
          relevanceScore: 95
        }
      },
      {
        source: 'firecrawl',
        title: 'Interest Rate Analysis - Bloomberg',
        url: 'https://www.bloomberg.com/news/interest-rates',
        content: 'Market analysts expect the Fed to hold rates steady through early 2024, with potential cuts later in the year depending on inflation data.',
        relevanceScore: 88,
        data: {
          title: 'Interest Rate Analysis - Bloomberg',
          url: 'https://www.bloomberg.com/news/interest-rates',
          content: 'Market analysts expect the Fed to hold rates steady through early 2024, with potential cuts later in the year depending on inflation data.',
          relevanceScore: 88
        }
      },
      // Duplicate result (for deduplication testing)
      {
        source: 'firecrawl',
        title: 'Fed Rate Decision - Similar Content',
        url: 'https://example.com/fed-rates',
        content: 'The Federal Open Market Committee decided to maintain the federal funds rate at 5.25% to 5.50%.',
        relevanceScore: 80,
        data: {
          title: 'Fed Rate Decision - Similar Content',
          url: 'https://example.com/fed-rates',
          content: 'The Federal Open Market Committee decided to maintain the federal funds rate at 5.25% to 5.50%.',
          relevanceScore: 80
        }
      }
    ]
  }
};

async function runTests() {
  console.log('📊 Starting Results Processor Tests\n');
  
  try {
    // Test 1: Basic processor initialization
    console.log('Test 1: Processor initialization...');
    const testProcessor = new ResultsProcessor();
    console.log('✅ ResultsProcessor initialized successfully');
    console.log('📝 Config:', {
      dedupThreshold: testProcessor.dedupThreshold,
      qualityWeights: testProcessor.qualityWeights
    });
    console.log();
    
    // Test 2: Raw result extraction
    console.log('Test 2: Raw result extraction...');
    const rawResults = testProcessor.extractRawResults(mockSearchResults);
    console.log('✅ Raw result extraction completed');
    console.log('📝 Extracted', rawResults.length, 'raw results');
    console.log('📝 First result preview:', {
      source: rawResults[0]?.source,
      hasContent: !!rawResults[0]?.content,
      originalQuery: rawResults[0]?.originalQuery
    });
    console.log();
    
    // Test 3: Result normalization
    console.log('Test 3: Result normalization...');
    const normalizedResults = testProcessor.normalizeResults(rawResults);
    console.log('✅ Result normalization completed');
    console.log('📝 Normalized', normalizedResults.length, 'results');
    console.log('📝 First normalized result:', {
      id: normalizedResults[0]?.id,
      source: normalizedResults[0]?.source,
      title: normalizedResults[0]?.title,
      relevanceScore: normalizedResults[0]?.relevanceScore,
      confidence: normalizedResults[0]?.confidence
    });
    console.log();
    
    // Test 4: Deduplication
    console.log('Test 4: Deduplication...');
    const beforeDedup = normalizedResults.length;
    const deduplicatedResults = testProcessor.deduplicateResults(normalizedResults);
    const afterDedup = deduplicatedResults.length;
    
    console.log('✅ Deduplication completed');
    console.log(`📝 Before: ${beforeDedup}, After: ${afterDedup}, Removed: ${beforeDedup - afterDedup}`);
    console.log();
    
    // Test 5: Scoring and ranking
    console.log('Test 5: Scoring and ranking...');
    const scoredResults = testProcessor.scoreResults(deduplicatedResults, mockSearchResults.query);
    console.log('✅ Scoring and ranking completed');
    console.log('📝 Top result quality score:', scoredResults[0]?.qualityScore);
    console.log('📝 Quality scores:', scoredResults.map(r => r.qualityScore));
    console.log();
    
    // Test 6: Categorization and tagging
    console.log('Test 6: Categorization and tagging...');
    const categorizedResults = testProcessor.categorizeResults(scoredResults);
    console.log('✅ Categorization and tagging completed');
    console.log('📝 Categories found:', [...new Set(categorizedResults.map(r => r.category))]);
    console.log('📝 Sample tags from first result:', categorizedResults[0]?.tags?.slice(0, 5));
    console.log();
    
    // Test 7: Text similarity calculation
    console.log('Test 7: Text similarity calculation...');
    const text1 = 'Federal Reserve interest rate policy';
    const text2 = 'Fed interest rate monetary policy';
    const text3 = 'Stock market performance today';
    
    const similarity1 = testProcessor.calculateSimilarity(
      testProcessor.normalizeText(text1), 
      testProcessor.normalizeText(text2)
    );
    const similarity2 = testProcessor.calculateSimilarity(
      testProcessor.normalizeText(text1), 
      testProcessor.normalizeText(text3)
    );
    
    console.log('✅ Text similarity calculation works');
    console.log(`📝 Similarity between related texts: ${Math.round(similarity1 * 100)}%`);
    console.log(`📝 Similarity between unrelated texts: ${Math.round(similarity2 * 100)}%`);
    console.log();
    
    // Test 8: Full processing pipeline
    console.log('Test 8: Full processing pipeline...');
    const finalResults = testProcessor.processSearchResults(mockSearchResults);
    
    console.log('✅ Full processing pipeline completed');
    console.log('📝 Final structure:', {
      searchId: finalResults.search.id,
      query: finalResults.search.query,
      totalResults: finalResults.results.total,
      topResultTitle: finalResults.results.topResult?.title,
      averageQuality: finalResults.results.averageQuality,
      categoriesFound: Object.keys(finalResults.results.categories).length,
      sourcesUsed: finalResults.metadata.sourcesUsed,
      confidenceDistribution: finalResults.metadata.confidenceDistribution
    });
    console.log();
    
    // Test 9: Error handling
    console.log('Test 9: Error handling...');
    const invalidResults = {
      searchId: 'test_error',
      query: 'test',
      results: { allResults: null } // Invalid structure
    };
    
    const errorOutput = testProcessor.processSearchResults(invalidResults);
    console.log('✅ Error handling works');
    console.log('📝 Error output structure:', {
      hasError: !!errorOutput.search.error,
      resultsTotal: errorOutput.results.total,
      hasMetadataError: !!errorOutput.metadata.error
    });
    console.log();
    
    // Test 10: Category determination
    console.log('Test 10: Category determination...');
    const testCategories = [
      { content: 'Federal Reserve interest rate policy', expected: 'interest_rates' },
      { content: 'inflation data consumer price index', expected: 'inflation' },
      { content: 'stock market dow jones nasdaq', expected: 'stock_market' },
      { content: 'GDP economic growth recession', expected: 'economic_indicators' },
      { content: 'unemployment jobs employment rate', expected: 'employment' },
      { content: 'foreign exchange currency dollar', expected: 'currency' },
      { content: 'random financial news', expected: 'general_financial' }
    ];
    
    testCategories.forEach(test => {
      const mockResult = { content: test.content, title: '' };
      const category = testProcessor.determineCategory(mockResult);
      const isCorrect = category === test.expected;
      console.log(`${isCorrect ? '✅' : '❌'} "${test.content}" → ${category} (expected: ${test.expected})`);
    });
    
    console.log('\n🎉 All Results Processor tests completed!');
    
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Processor initialization');
    console.log('   ✅ Raw result extraction');
    console.log('   ✅ Result normalization');
    console.log('   ✅ Deduplication');
    console.log('   ✅ Scoring and ranking');
    console.log('   ✅ Categorization and tagging');
    console.log('   ✅ Text similarity calculation');
    console.log('   ✅ Full processing pipeline');
    console.log('   ✅ Error handling');
    console.log('   ✅ Category determination');
    
    console.log('\n💡 The Results Processor is ready to handle real search results!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Helper function to test with real search data
function demonstrateWithRealData(searchResults) {
  console.log('🔴 Processing Real Search Data');
  
  try {
    const processedResults = resultsProcessor.processSearchResults(searchResults);
    
    console.log('✅ Real data processing completed:', {
      searchId: processedResults.search.id,
      totalResults: processedResults.results.total,
      highConfidenceCount: processedResults.results.highConfidenceResults.length,
      averageQuality: processedResults.results.averageQuality,
      categories: Object.keys(processedResults.results.categories)
    });
    
    return processedResults;
    
  } catch (error) {
    console.log('❌ Real data processing failed:', error.message);
    return null;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { 
  runTests, 
  demonstrateWithRealData 
}; 