/**
 * Search Orchestrator
 * 
 * This service orchestrates parallel execution of searches across 
 * both Perplexity and Firecrawl to maximize data gathering efficiency.
 */

const { 
  searchWithPerplexity, 
  searchMultipleQuestions: perplexityBatchSearch 
} = require('./perplexityService');

const { 
  extractDataForQuery, 
  extractDataForMultipleQueries: firecrawlBatchExtraction 
} = require('./firecrawlService');

/**
 * Search orchestrator configuration
 */
const orchestratorConfig = {
  enablePerplexity: true,
  enableFirecrawl: true,
  parallelExecution: true,
  timeout: 120000, // 2 minutes total timeout
  maxConcurrentQueries: 3,
  retryAttempts: 2,
  fallbackEnabled: true
};

/**
 * Search result status enumeration
 */
const SearchStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled'
};

/**
 * SearchOrchestrator class to manage parallel search operations
 */
class SearchOrchestrator {
  constructor(config = orchestratorConfig) {
    this.config = { ...orchestratorConfig, ...config };
    this.activeSearches = new Map();
    this.searchQueue = [];
    this.isProcessing = false;
  }

  /**
   * Execute a single search across both platforms in parallel
   */
  async executeParallelSearch(query, options = {}) {
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[ORCHESTRATOR] Starting parallel search ${searchId} for: "${query}"`);
    
    const searchOperation = {
      id: searchId,
      query: query,
      status: SearchStatus.IN_PROGRESS,
      startTime: Date.now(),
      timeout: options.timeout || this.config.timeout,
      enablePerplexity: options.enablePerplexity ?? this.config.enablePerplexity,
      enableFirecrawl: options.enableFirecrawl ?? this.config.enableFirecrawl,
      results: {
        perplexity: null,
        firecrawl: null,
        combined: null
      },
      errors: {}
    };

    this.activeSearches.set(searchId, searchOperation);

    try {
      const searchPromises = [];
      
      // Add Perplexity search if enabled
      if (searchOperation.enablePerplexity) {
        const perplexityPromise = this.executePerplexitySearch(query, searchId);
        searchPromises.push(perplexityPromise);
      }
      
      // Add Firecrawl search if enabled
      if (searchOperation.enableFirecrawl) {
        const firecrawlPromise = this.executeFirecrawlSearch(query, searchId);
        searchPromises.push(firecrawlPromise);
      }

      if (searchPromises.length === 0) {
        throw new Error('No search providers enabled');
      }

      // Execute searches in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), searchOperation.timeout)
      );

      await Promise.race([
        Promise.allSettled(searchPromises),
        timeoutPromise
      ]);

      // Combine results
      const combinedResults = this.combineSearchResults(searchOperation);
      searchOperation.results.combined = combinedResults;
      searchOperation.status = SearchStatus.COMPLETED;
      searchOperation.endTime = Date.now();
      searchOperation.duration = searchOperation.endTime - searchOperation.startTime;

      console.log(`[ORCHESTRATOR] ✅ Parallel search ${searchId} completed in ${searchOperation.duration}ms`);
      
      return {
        searchId: searchId,
        query: query,
        results: combinedResults,
        duration: searchOperation.duration,
        status: SearchStatus.COMPLETED,
        sources: {
          perplexity: !!searchOperation.results.perplexity,
          firecrawl: !!searchOperation.results.firecrawl
        }
      };

    } catch (error) {
      console.error(`[ORCHESTRATOR] ❌ Parallel search ${searchId} failed:`, error.message);
      
      searchOperation.status = error.message.includes('timeout') ? SearchStatus.TIMEOUT : SearchStatus.FAILED;
      searchOperation.endTime = Date.now();
      searchOperation.error = error.message;

      // Return fallback results if available
      if (this.config.fallbackEnabled) {
        const fallbackResults = this.createFallbackResults(searchOperation);
        if (fallbackResults) {
          console.log(`[ORCHESTRATOR] ⚠️  Using fallback results for search ${searchId}`);
          return fallbackResults;
        }
      }

      throw error;
    } finally {
      // Clean up after a delay
      setTimeout(() => {
        this.activeSearches.delete(searchId);
      }, 60000); // Keep for 1 minute for debugging
    }
  }

  /**
   * Execute Perplexity search with error handling
   */
  async executePerplexitySearch(query, searchId) {
    try {
      const result = await searchWithPerplexity(query);
      
      const operation = this.activeSearches.get(searchId);
      if (operation) {
        operation.results.perplexity = result;
      }
      
      return result;
      
    } catch (error) {
      console.error(`[ORCHESTRATOR] ❌ Perplexity search failed for ${searchId}:`, error.message);
      
      const operation = this.activeSearches.get(searchId);
      if (operation) {
        operation.errors.perplexity = error.message;
      }
      
      return null;
    }
  }

  /**
   * Execute Firecrawl search with error handling
   */
  async executeFirecrawlSearch(query, searchId) {
    try {
      const result = await extractDataForQuery(query);
      
      const operation = this.activeSearches.get(searchId);
      if (operation) {
        operation.results.firecrawl = result;
      }
      
      return result;
      
    } catch (error) {
      console.error(`[ORCHESTRATOR] ❌ Firecrawl search failed for ${searchId}:`, error.message);
      
      const operation = this.activeSearches.get(searchId);
      if (operation) {
        operation.errors.firecrawl = error.message;
      }
      
      return null;
    }
  }

  /**
   * Execute batch searches across multiple queries
   */
  async executeBatchSearch(queries, options = {}) {
    console.log(`[ORCHESTRATOR] Starting batch search for ${queries.length} queries`);
    
    const batchId = `batch_${Date.now()}`;
    const batchStartTime = Date.now();
    
    // Limit concurrent searches
    const maxConcurrent = options.maxConcurrent || this.config.maxConcurrentQueries;
    const results = [];
    
    // Process queries in chunks to control concurrency
    for (let i = 0; i < queries.length; i += maxConcurrent) {
      const chunk = queries.slice(i, i + maxConcurrent);
      
      const chunkPromises = chunk.map(query => 
        this.executeParallelSearch(query, options)
          .catch(error => ({
            query: query,
            status: SearchStatus.FAILED,
            error: error.message,
            results: null
          }))
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Add delay between chunks to respect rate limits
      if (i + maxConcurrent < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const batchDuration = Date.now() - batchStartTime;
    const successfulResults = results.filter(r => r.status === SearchStatus.COMPLETED);
    const failedResults = results.filter(r => r.status !== SearchStatus.COMPLETED);
    
    console.log(`[ORCHESTRATOR] ✅ Batch search ${batchId} completed in ${batchDuration}ms`);
    return {
      batchId: batchId,
      queries: queries,
      results: results,
      successful: successfulResults,
      failed: failedResults,
      duration: batchDuration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Combine results from both search sources
   */
  combineSearchResults(searchOperation) {
    const { perplexity, firecrawl } = searchOperation.results;
    
    const combined = {
      query: searchOperation.query,
      searchId: searchOperation.id,
      sources: [],
      allResults: [],
      summary: {
        totalSources: 0,
        perplexityAvailable: !!perplexity && !perplexity.error,
        firecrawlAvailable: !!firecrawl && firecrawl.successful && firecrawl.successful.length > 0,
        combinedConfidence: 0
      },
      timestamp: new Date().toISOString()
    };

    // Add Perplexity results
    if (perplexity && !perplexity.error) {
      combined.sources.push('perplexity');
      combined.allResults.push({
        source: 'perplexity',
        content: perplexity.content,
        confidence: perplexity.confidence,
        searchId: perplexity.searchId
      });
      combined.summary.totalSources++;
    }

    // Add Firecrawl results
    if (firecrawl && firecrawl.successful && firecrawl.successful.length > 0) {
      combined.sources.push('firecrawl');
      firecrawl.successful.forEach(result => {
        combined.allResults.push({
          source: 'firecrawl',
          title: result.data?.title,
          url: result.data?.url,
          content: result.data?.content,
          relevanceScore: result.data?.relevanceScore,
          extractedData: result.data?.extractedData
        });
      });
      combined.summary.totalSources++;
    }

    // Calculate combined confidence
    if (combined.allResults.length > 0) {
      const confidenceSum = combined.allResults.reduce((sum, result) => {
        return sum + (result.confidence === 'high' ? 90 : result.relevanceScore || 50);
      }, 0);
      combined.summary.combinedConfidence = Math.round(confidenceSum / combined.allResults.length);
    }

    return combined;
  }

  /**
   * Create fallback results from partial data
   */
  createFallbackResults(searchOperation) {
    const { perplexity, firecrawl } = searchOperation.results;
    
    // If we have at least one successful result, create fallback
    if ((perplexity && !perplexity.error) || 
        (firecrawl && firecrawl.successful && firecrawl.successful.length > 0)) {
      
      const combinedResults = this.combineSearchResults(searchOperation);
      
      return {
        searchId: searchOperation.id,
        query: searchOperation.query,
        results: combinedResults,
        status: 'partial_success',
        sources: combinedResults.sources,
        errors: searchOperation.errors
      };
    }
    
    return null;
  }

  /**
   * Cancel an active search
   */
  cancelSearch(searchId) {
    const operation = this.activeSearches.get(searchId);
    if (operation) {
      operation.status = SearchStatus.CANCELLED;
      console.log(`[ORCHESTRATOR] ⏹️  Search ${searchId} cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Get status of active searches
   */
  getActiveSearches() {
    const searches = Array.from(this.activeSearches.values());
    return searches.map(search => ({
      id: search.id,
      query: search.query,
      status: search.status,
      duration: search.endTime ? (search.endTime - search.startTime) : (Date.now() - search.startTime),
      sources: {
        perplexity: !!search.results.perplexity,
        firecrawl: !!search.results.firecrawl
      }
    }));
  }
}

// Create a singleton instance
const searchOrchestrator = new SearchOrchestrator();

module.exports = {
  SearchOrchestrator,
  searchOrchestrator,
  SearchStatus
}; 