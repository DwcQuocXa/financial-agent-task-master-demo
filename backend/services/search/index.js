/**
 * Unified Search Service
 * 
 * This is the main entry point for the complete search functionality.
 * It integrates Gemini planning, Perplexity search, Firecrawl extraction,
 * parallel execution orchestration, and results processing.
 */

const { planFinancialResearch } = require('../gemini/planningService');
const { searchOrchestrator } = require('./searchOrchestrator');
const { resultsProcessor } = require('./resultsProcessor');

/**
 * Main search service class that orchestrates the complete workflow
 */
class FinancialSearchService {
  constructor() {
    this.isInitialized = false;
    this.config = {
      enablePlanning: true,
      enableSearch: true,
      enableResultsProcessing: true,
      maxSubQuestions: 5,
      searchTimeout: 120000, // 2 minutes
      enableCaching: false // Removed caching
    };
  }

  /**
   * Initialize the search service
   */
  async initialize() {
    try {
      console.log('[SEARCH-SERVICE] Initializing Financial Search Service...');
      
      // The orchestrator and results processor are ready to use
      this.isInitialized = true;
      console.log('[SEARCH-SERVICE] ✅ Financial Search Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[SEARCH-SERVICE] ❌ Failed to initialize:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Execute a complete financial search workflow
   */
  async executeFinancialSearch(userQuery, options = {}) {
    const startTime = Date.now();
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[SEARCH-SERVICE] Starting financial search ${searchId} for: "${userQuery}"`);
    
    try {
      // Ensure service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      const workflow = {
        searchId: searchId,
        userQuery: userQuery,
        startTime: startTime,
        steps: {
          planning: null,
          searching: null,
          processing: null
        },
        results: null,
        error: null
      };

      // Step 1: Planning Phase (Generate sub-questions)
      let subQuestions = [];
      
      if (this.config.enablePlanning && options.enablePlanning !== false) {
        try {
          console.log(`[SEARCH-SERVICE] Step 1: Planning - Generating research sub-questions...`);
          
          const planningResult = await planFinancialResearch(userQuery);
          
          if (planningResult && planningResult.subQuestions && Array.isArray(planningResult.subQuestions)) {
            subQuestions = planningResult.subQuestions.slice(0, this.config.maxSubQuestions);
            workflow.steps.planning = {
              success: true,
              subQuestions: subQuestions,
              originalPlan: planningResult
            };
            
            console.log(`[SEARCH-SERVICE] ✅ Planning completed - Generated ${subQuestions.length} sub-questions`);
          } else {
            throw new Error('Invalid planning result structure');
          }
          
        } catch (planningError) {
          console.warn(`[SEARCH-SERVICE] ⚠️  Planning failed: ${planningError.message}`);
          console.log(`[SEARCH-SERVICE] Falling back to direct search with original query`);
          
          // Fallback to original query
          subQuestions = [userQuery];
          workflow.steps.planning = {
            success: false,
            error: planningError.message,
            fallback: true,
            subQuestions: subQuestions
          };
        }
      } else {
        // Use original query directly
        subQuestions = [userQuery];
        workflow.steps.planning = {
          success: true,
          subQuestions: subQuestions,
          note: 'Planning disabled - using original query'
        };
      }

      // Step 2: Search Phase (Execute parallel searches)
      let searchResults = null;
      
      if (this.config.enableSearch && options.enableSearch !== false) {
        try {
          console.log(`[SEARCH-SERVICE] Step 2: Searching - Executing parallel searches for ${subQuestions.length} queries...`);
          
          if (subQuestions.length === 1) {
            // Single search
            searchResults = await searchOrchestrator.executeParallelSearch(
              subQuestions[0], 
              {
                timeout: options.searchTimeout || this.config.searchTimeout,
                enablePerplexity: options.enablePerplexity,
                enableFirecrawl: options.enableFirecrawl
              }
            );
            
            // Wrap single result in batch format
            searchResults = {
              batchId: `single_${searchResults.searchId}`,
              results: [searchResults],
              successful: [searchResults],
              failed: [],
              queries: subQuestions
            };
            
          } else {
            // Batch search
            searchResults = await searchOrchestrator.executeBatchSearch(
              subQuestions,
              {
                timeout: options.searchTimeout || this.config.searchTimeout,
                maxConcurrent: options.maxConcurrent || 3,
                enablePerplexity: options.enablePerplexity,
                enableFirecrawl: options.enableFirecrawl
              }
            );
          }
          
          workflow.steps.searching = {
            success: true,
            batchId: searchResults.batchId,
            totalQueries: searchResults.results.length,
            successful: searchResults.successful.length,
            failed: searchResults.failed.length
          };
          
          console.log(`[SEARCH-SERVICE] ✅ Searching completed - ${searchResults.successful.length} successful, ${searchResults.failed.length} failed`);
          
        } catch (searchError) {
          console.error(`[SEARCH-SERVICE] ❌ Search failed: ${searchError.message}`);
          workflow.steps.searching = {
            success: false,
            error: searchError.message
          };
          throw searchError;
        }
      } else {
        throw new Error('Search is disabled');
      }

      // Step 3: Results Processing Phase
      let finalResults = null;
      
      if (this.config.enableResultsProcessing && options.enableResultsProcessing !== false) {
        try {
          console.log(`[SEARCH-SERVICE] Step 3: Processing - Structuring and ranking results...`);
          
          // Combine all successful search results
          const combinedSearchResults = this.combineSearchResults(searchResults, userQuery, searchId);
          
          // Process with results processor
          finalResults = resultsProcessor.processSearchResults(combinedSearchResults);
          
          workflow.steps.processing = {
            success: true,
            totalResults: finalResults.results.total,
            averageQuality: finalResults.results.averageQuality,
            categories: Object.keys(finalResults.results.categories).length
          };
          
          console.log(`[SEARCH-SERVICE] ✅ Processing completed - ${finalResults.results.total} final results`);
          
        } catch (processingError) {
          console.error(`[SEARCH-SERVICE] ❌ Results processing failed: ${processingError.message}`);
          workflow.steps.processing = {
            success: false,
            error: processingError.message
          };
          
          // Return raw search results as fallback
          finalResults = this.createFallbackResults(searchResults, userQuery, searchId);
        }
      } else {
        // Return raw search results
        finalResults = this.createFallbackResults(searchResults, userQuery, searchId);
        workflow.steps.processing = {
          success: true,
          note: 'Results processing disabled - returning raw results'
        };
      }

      // Complete the workflow
      const endTime = Date.now();
      workflow.duration = endTime - startTime;
      workflow.endTime = endTime;
      
      // Add workflow summary to results (avoid circular reference)
      finalResults.workflow = {
        searchId: workflow.searchId,
        userQuery: workflow.userQuery,
        startTime: workflow.startTime,
        endTime: workflow.endTime,
        duration: workflow.duration,
        steps: workflow.steps,
        // Don't include workflow.results to avoid circular reference
        status: 'completed'
      };

      console.log(`[SEARCH-SERVICE] ✅ Financial search ${searchId} completed in ${workflow.duration}ms`);
      
      return finalResults;

    } catch (error) {
      const endTime = Date.now();
      console.error(`[SEARCH-SERVICE] ❌ Financial search ${searchId} failed: ${error.message}`);
      
      return {
        search: {
          id: searchId,
          query: userQuery,
          timestamp: new Date().toISOString(),
          duration: endTime - startTime,
          error: error.message
        },
        results: {
          total: 0,
          items: [],
          error: 'Search failed'
        },
        metadata: {
          error: error.message,
          processingTime: endTime
        },
        workflow: {
          searchId: searchId,
          userQuery: userQuery,
          startTime: startTime,
          endTime: endTime,
          duration: endTime - startTime,
          error: error.message
        }
      };
    }
  }

  /**
   * Combine search results from batch into a single structure
   */
  combineSearchResults(batchResults, originalQuery, searchId) {
    const allResults = [];
    
    // Extract all results from successful searches
    batchResults.successful.forEach(searchResult => {
      if (searchResult.results && searchResult.results.allResults) {
        allResults.push(...searchResult.results.allResults);
      }
    });
    
    return {
      searchId: searchId,
      query: originalQuery,
      duration: batchResults.duration,
      status: 'completed',
      sources: {
        perplexity: allResults.some(r => r.source === 'perplexity'),
        firecrawl: allResults.some(r => r.source === 'firecrawl')
      },
      results: {
        allResults: allResults
      }
    };
  }

  /**
   * Create fallback results when processing fails
   */
  createFallbackResults(searchResults, userQuery, searchId) {
    const allResults = [];
    
    searchResults.successful.forEach(result => {
      if (result.results && result.results.allResults) {
        result.results.allResults.forEach(item => {
          allResults.push({
            source: item.source,
            title: item.title || item.data?.title || 'Search Result',
            content: item.content || item.data?.content || 'No content available',
            url: item.url || item.data?.url || null,
            relevanceScore: item.relevanceScore || item.data?.relevanceScore || 50
          });
        });
      }
    });
    
    return {
      search: {
        id: searchId,
        query: userQuery,
        timestamp: new Date().toISOString(),
        fallback: true
      },
      results: {
        total: allResults.length,
        items: allResults,
        note: 'Fallback results - limited processing applied'
      },
      metadata: {
        fallback: true,
        sourcesUsed: [...new Set(allResults.map(r => r.source))]
      }
    };
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      config: this.config,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const financialSearchService = new FinancialSearchService();

module.exports = {
  FinancialSearchService,
  financialSearchService
}; 