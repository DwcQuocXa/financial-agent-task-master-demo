/**
 * Firecrawl Web Data Extraction Service
 * 
 * This service handles web data extraction using Firecrawl for financial research.
 * It takes sub-questions and crawls relevant websites to extract structured data.
 */

const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { getFirecrawlConfig, logFirecrawlConfigStatus } = require('./firecrawlConfig');

let firecrawlClient = null;

/**
 * Initialize the Firecrawl client with proper configuration
 */
async function initializeFirecrawlClient() {
  try {
    console.log('[FIRECRAWL] Initializing Firecrawl client...');
    
    // Get validated configuration
    const config = getFirecrawlConfig();
    
    // Initialize the Firecrawl client
    firecrawlClient = new FirecrawlApp({ apiKey: config.apiKey });
    
    return firecrawlClient;
    
  } catch (error) {
    console.error('[FIRECRAWL] ❌ Failed to initialize Firecrawl client:', error.message);
    throw new Error(`Firecrawl initialization failed: ${error.message}`);
  }
}

/**
 * Test the Firecrawl connection with a simple scrape
 */
async function testFirecrawlConnection() {
  try {
    console.log('[FIRECRAWL] Testing Firecrawl connection...');
    
    if (!firecrawlClient) {
      await initializeFirecrawlClient();
    }
    
    // Simple test scrape
    const testUrl = 'https://example.com';
    const testResponse = await firecrawlClient.scrapeUrl(testUrl, {
      formats: ['markdown', 'html'],
      onlyMainContent: true
    });
    
    console.log('[FIRECRAWL] ✅ Firecrawl connection test successful');
    console.log('[FIRECRAWL] Test response length:', testResponse.data?.markdown?.length || 0);
    
    return {
      success: true,
      response: testResponse.data?.markdown?.substring(0, 200) || 'No content extracted'
    };
    
  } catch (error) {
    console.error('[FIRECRAWL] ❌ Firecrawl connection test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the initialized Firecrawl client (initializes if needed)
 */
async function getFirecrawlClient() {
  if (!firecrawlClient) {
    await initializeFirecrawlClient();
  }
  return firecrawlClient;
}

/**
 * Generate relevant URLs for a financial search query
 */
function generateFinancialSearchUrls(query) {
  const encodedQuery = encodeURIComponent(query);
  
  // List of financial websites to search
  const financialSites = [
    `https://www.investopedia.com/search?q=${encodedQuery}`,
    `https://finance.yahoo.com/search?p=${encodedQuery}`,
    `https://www.marketwatch.com/search?q=${encodedQuery}`,
    `https://www.bloomberg.com/search?query=${encodedQuery}`,
    `https://www.cnbc.com/search/?query=${encodedQuery}`,
    `https://www.reuters.com/search/news?blob=${encodedQuery}`,
    `https://www.wsj.com/search?query=${encodedQuery}`,
    `https://seekingalpha.com/search?q=${encodedQuery}`
  ];
  
  return financialSites;
}

/**
 * Extract and structure content from crawl results
 */
function extractStructuredContent(crawlResult, query) {
  try {
    if (!crawlResult || !crawlResult.data) {
      return null;
    }
    
    const content = crawlResult.data;
    
    // Extract relevant information
    const structuredContent = {
      title: content.metadata?.title || 'No title',
      url: content.metadata?.sourceURL || content.url || 'Unknown URL',
      content: content.markdown || content.html || 'No content extracted',
      summary: content.metadata?.description || 'No description',
      keywords: content.metadata?.keywords || [],
      publishDate: content.metadata?.publishDate || null,
      author: content.metadata?.author || null,
      extractedData: content.llm_extraction || null,
      relevanceScore: calculateRelevanceScore(content, query)
    };
    
    return structuredContent;
    
  } catch (error) {
    console.error('[FIRECRAWL] Error extracting content:', error.message);
    return null;
  }
}

/**
 * Calculate relevance score based on content and query
 */
function calculateRelevanceScore(content, query) {
  try {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentText = (content.markdown || content.html || '').toLowerCase();
    
    let score = 0;
    let totalWords = queryWords.length;
    
    queryWords.forEach(word => {
      if (contentText.includes(word)) {
        score += 1;
      }
    });
    
    return Math.round((score / totalWords) * 100);
    
  } catch (error) {
    return 0;
  }
}

/**
 * Scrape a single URL with Firecrawl
 */
async function scrapeUrl(url, query) {
  try {
    console.log('[FIRECRAWL] Scraping URL:', url);
    
    const client = await getFirecrawlClient();
    const config = getFirecrawlConfig();
    
    // Simplified scrape options to avoid API format conflicts
    const scrapeOptions = {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: config.timeout,
      waitFor: config.waitFor
    };
    
    const result = await client.scrapeUrl(url, scrapeOptions);
    
    if (result.success) {
      console.log('[FIRECRAWL] ✅ Successfully scraped URL');
      const structured = extractStructuredContent(result, query);
      
      return {
        success: true,
        data: structured,
        url: url,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log('[FIRECRAWL] ❌ Failed to scrape URL:', result.error);
      return {
        success: false,
        error: result.error,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    console.error('[FIRECRAWL] ❌ Error scraping URL:', error.message);
    return {
      success: false,
      error: error.message,
      url: url,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Perform web data extraction for a financial query
 */
async function extractDataForQuery(query) {
  try {
    console.log('[FIRECRAWL] Starting data extraction for:', query);
    
    const config = getFirecrawlConfig();
    
    // Generate relevant URLs for the query
    const urls = generateFinancialSearchUrls(query);
    
    // Limit the number of URLs to scrape
    const urlsToScrape = urls.slice(0, config.maxPages);
    
    console.log('[FIRECRAWL] Scraping', urlsToScrape.length, 'URLs');
    
    // Scrape URLs with controlled concurrency
    const results = [];
    for (const url of urlsToScrape) {
      const result = await scrapeUrl(url, query);
      results.push(result);
      
      // Add a small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Filter successful results
    const successfulResults = results.filter(r => r.success && r.data);
    const failedResults = results.filter(r => !r.success);
    
    // Sort by relevance score
    successfulResults.sort((a, b) => (b.data.relevanceScore || 0) - (a.data.relevanceScore || 0));
    
    console.log('[FIRECRAWL] ✅ Data extraction completed:');
    console.log(`[FIRECRAWL] - Successful: ${successfulResults.length}`);
    console.log(`[FIRECRAWL] - Failed: ${failedResults.length}`);
    
    return {
      query: query,
      source: 'firecrawl',
      successful: successfulResults,
      failed: failedResults,
      total: results.length,
      timestamp: new Date().toISOString(),
      extractionId: `fc_${Date.now()}`
    };
    
  } catch (error) {
    console.error('[FIRECRAWL] ❌ Data extraction failed:', error.message);
    throw error;
  }
}

/**
 * Extract data for multiple queries
 */
async function extractDataForMultipleQueries(queries) {
  try {
    console.log('[FIRECRAWL] Starting batch data extraction for', queries.length, 'queries');
    
    const results = [];
    
    // Process queries sequentially to avoid overwhelming the service
    for (const query of queries) {
      const result = await extractDataForQuery(query);
      results.push(result);
      
      // Add delay between queries
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('[FIRECRAWL] ✅ Batch extraction completed');
    
    return {
      batchId: `batch_fc_${Date.now()}`,
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[FIRECRAWL] ❌ Batch extraction failed:', error.message);
    throw error;
  }
}

module.exports = {
  initializeFirecrawlClient,
  testFirecrawlConnection,
  getFirecrawlClient,
  scrapeUrl,
  extractDataForQuery,
  extractDataForMultipleQueries,
  generateFinancialSearchUrls
}; 