/**
 * Results Processor
 * 
 * This service handles collection, merging, deduplication, and structuring
 * of search results from multiple sources (Perplexity and Firecrawl).
 */

/**
 * Results collection and processing class
 */
class ResultsProcessor {
  constructor() {
    this.dedupThreshold = 0.8; // Similarity threshold for deduplication
    this.qualityWeights = {
      relevance: 0.4,
      confidence: 0.3,
      freshness: 0.2,
      completeness: 0.1
    };
  }

  /**
   * Process and structure results from search orchestrator
   */
  processSearchResults(searchResults) {
    console.log('[RESULTS] Processing search results...');
    
    try {
      // Extract all individual results
      const rawResults = this.extractRawResults(searchResults);
      
      // Normalize all results to standard schema
      const normalizedResults = this.normalizeResults(rawResults);
      
      // Deduplicate similar results
      const deduplicatedResults = this.deduplicateResults(normalizedResults);
      
      // Score and rank results
      const scoredResults = this.scoreResults(deduplicatedResults, searchResults.query);
      
      // Categorize and tag results
      const categorizedResults = this.categorizeResults(scoredResults);
      
      // Create structured output
      const structuredOutput = this.createStructuredOutput(
        searchResults, 
        categorizedResults
      );
      
      console.log(`[RESULTS] ✅ Processed ${rawResults.length} raw results into ${categorizedResults.length} final results`);
      
      return structuredOutput;
      
    } catch (error) {
      console.error('[RESULTS] ❌ Error processing results:', error.message);
      return this.createErrorOutput(searchResults, error);
    }
  }

  /**
   * Extract raw results from all sources
   */
  extractRawResults(searchResults) {
    const rawResults = [];
    
    // Extract from combined results if available
    if (searchResults.results && searchResults.results.allResults) {
      searchResults.results.allResults.forEach(result => {
        rawResults.push({
          ...result,
          originalSearchId: searchResults.searchId,
          originalQuery: searchResults.query
        });
      });
    }
    
    return rawResults;
  }

  /**
   * Normalize results to standard schema
   */
  normalizeResults(rawResults) {
    return rawResults.map((result, index) => {
      const normalized = {
        id: `result_${Date.now()}_${index}`,
        searchId: result.originalSearchId || 'unknown',
        query: result.originalQuery || 'unknown',
        source: result.source || 'unknown',
        sourceUrl: this.extractSourceUrl(result),
        title: this.extractTitle(result),
        content: this.extractContent(result),
        summary: this.extractSummary(result),
        relevanceScore: this.extractRelevanceScore(result),
        confidence: this.extractConfidence(result),
        timestamp: new Date().toISOString(),
        sourceData: result,
        category: 'uncategorized',
        tags: [],
        qualityScore: 0,
        dataFreshness: 'unknown'
      };
      
      return normalized;
    });
  }

  /**
   * Extract source URL from result
   */
  extractSourceUrl(result) {
    return result.url || 
           result.sourceUrl || 
           result.data?.url || 
           result.data?.sourceUrl || 
           null;
  }

  /**
   * Extract title from result
   */
  extractTitle(result) {
    return result.title || 
           result.data?.title || 
           result.metadata?.title ||
           `${result.source} Result` ||
           'Untitled';
  }

  /**
   * Extract content from result
   */
  extractContent(result) {
    return result.content || 
           result.data?.content || 
           result.text ||
           result.markdown ||
           JSON.stringify(result.extractedData || {}) ||
           'No content available';
  }

  /**
   * Extract summary from result
   */
  extractSummary(result) {
    const content = this.extractContent(result);
    const summary = result.summary || 
                   result.data?.summary || 
                   result.metadata?.description ||
                   content.substring(0, 200) + '...';
    
    return summary;
  }

  /**
   * Extract relevance score from result
   */
  extractRelevanceScore(result) {
    return result.relevanceScore || 
           result.data?.relevanceScore || 
           (result.confidence === 'high' ? 85 : 
            result.confidence === 'medium' ? 65 : 45);
  }

  /**
   * Extract confidence from result
   */
  extractConfidence(result) {
    if (result.confidence) return result.confidence;
    
    const score = this.extractRelevanceScore(result);
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Deduplicate similar results
   */
  deduplicateResults(results) {
    const deduped = [];
    
    for (const result of results) {
      const titleKey = this.normalizeText(result.title);
      const contentKey = this.normalizeText(result.content.substring(0, 100));
      
      // Check for duplicates based on title and content similarity
      let isDuplicate = false;
      
      for (const existing of deduped) {
        const existingTitleKey = this.normalizeText(existing.title);
        const existingContentKey = this.normalizeText(existing.content.substring(0, 100));
        
        const titleSimilarity = this.calculateSimilarity(titleKey, existingTitleKey);
        const contentSimilarity = this.calculateSimilarity(contentKey, existingContentKey);
        
        if (titleSimilarity > this.dedupThreshold || contentSimilarity > this.dedupThreshold) {
          isDuplicate = true;
          
          // Merge with higher quality result
          if (result.relevanceScore > existing.relevanceScore) {
            // Replace existing with current result
            const index = deduped.indexOf(existing);
            deduped[index] = result;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        deduped.push(result);
      }
    }
    
    console.log(`[RESULTS] Deduplicated ${results.length} results to ${deduped.length} unique results`);
    return deduped;
  }

  /**
   * Calculate similarity between two strings
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  /**
   * Normalize text for comparison
   */
  normalizeText(text) {
    return text.toLowerCase()
               .replace(/[^\w\s]/g, '')
               .replace(/\s+/g, ' ')
               .trim();
  }

  /**
   * Score and rank results
   */
  scoreResults(results, query) {
    return results.map(result => {
      // Calculate quality score based on multiple factors
      const relevanceScore = result.relevanceScore;
      const confidenceScore = result.confidence === 'high' ? 100 : 
                            result.confidence === 'medium' ? 75 : 50;
      
      const freshnessScore = this.calculateFreshnessScore(result);
      const completenessScore = this.calculateCompletenessScore(result);
      
      const qualityScore = Math.round(
        (relevanceScore * this.qualityWeights.relevance) +
        (confidenceScore * this.qualityWeights.confidence) +
        (freshnessScore * this.qualityWeights.freshness) +
        (completenessScore * this.qualityWeights.completeness)
      );
      
      return {
        ...result,
        qualityScore,
        freshnessScore,
        completenessScore
      };
    }).sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Calculate freshness score based on timestamps and content
   */
  calculateFreshnessScore(result) {
    const now = new Date();
    const resultTime = new Date(result.timestamp);
    const ageInHours = (now - resultTime) / (1000 * 60 * 60);
    
    if (ageInHours < 1) return 100;
    if (ageInHours < 24) return 90;
    if (ageInHours < 168) return 70; // 1 week
    return 50;
  }

  /**
   * Calculate completeness score based on available data
   */
  calculateCompletenessScore(result) {
    let score = 0;
    const factors = [
      result.title && result.title !== 'Untitled',
      result.content && result.content.length > 50,
      result.sourceUrl,
      result.summary && result.summary.length > 20,
      result.sourceData && Object.keys(result.sourceData).length > 3
    ];
    
    const completeFactor = factors.filter(Boolean).length;
    return (completeFactor / factors.length) * 100;
  }

  /**
   * Categorize and tag results
   */
  categorizeResults(results) {
    return results.map(result => {
      const category = this.determineCategory(result);
      const tags = this.generateTags(result);
      
      return {
        ...result,
        category,
        tags
      };
    });
  }

  /**
   * Determine result category
   */
  determineCategory(result) {
    const content = result.content.toLowerCase();
    const title = result.title.toLowerCase();
    const text = content + ' ' + title;
    
    // Financial categories
    if (text.match(/interest rate|fed rate|federal reserve|monetary policy/)) {
      return 'interest_rates';
    }
    if (text.match(/inflation|cpi|consumer price|price index/)) {
      return 'inflation';
    }
    if (text.match(/stock|equity|market|dow|nasdaq|s&p/)) {
      return 'stock_market';
    }
    if (text.match(/gdp|economic growth|recession|economy/)) {
      return 'economic_indicators';
    }
    if (text.match(/employment|unemployment|jobs|labor/)) {
      return 'employment';
    }
    if (text.match(/currency|forex|exchange rate|dollar/)) {
      return 'currency';
    }
    
    return 'general_financial';
  }

  /**
   * Generate relevant tags
   */
  generateTags(result) {
    const tags = [];
    const content = result.content.toLowerCase();
    const title = result.title.toLowerCase();
    const text = content + ' ' + title;
    
    // Source tags
    tags.push(`source:${result.source}`);
    
    // Content type tags
    if (result.sourceUrl) {
      const domain = this.extractDomain(result.sourceUrl);
      if (domain) tags.push(`domain:${domain}`);
    }
    
    // Financial entity tags
    const entities = [
      'federal reserve', 'fed', 'treasury', 'sec', 'nasdaq', 'nyse',
      'dow jones', 's&p 500', 'russell', 'bloomberg', 'reuters'
    ];
    
    entities.forEach(entity => {
      if (text.includes(entity)) {
        tags.push(`entity:${entity.replace(/\s+/g, '_')}`);
      }
    });
    
    // Time-based tags
    const currentYear = new Date().getFullYear();
    if (text.includes(currentYear.toString())) {
      tags.push(`year:${currentYear}`);
    }
    
    return tags.slice(0, 10); // Limit tags
  }

  /**
   * Extract domain from URL
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  /**
   * Create structured output
   */
  createStructuredOutput(originalResults, processedResults) {
    return {
      search: {
        id: originalResults.searchId,
        query: originalResults.query,
        timestamp: new Date().toISOString(),
        duration: originalResults.duration,
        sources: originalResults.sources || {}
      },
      results: {
        total: processedResults.length,
        items: processedResults,
        categories: this.groupByCategory(processedResults),
        topResult: processedResults[0] || null,
        highConfidenceResults: processedResults.filter(r => r.confidence === 'high'),
        averageQuality: this.calculateAverageQuality(processedResults)
      },
      metadata: {
        processingTime: Date.now(),
        deduplicationApplied: true,
        qualityScored: true,
        sourcesUsed: [...new Set(processedResults.map(r => r.source))],
        confidenceDistribution: this.getConfidenceDistribution(processedResults)
      }
    };
  }

  /**
   * Group results by category
   */
  groupByCategory(results) {
    const grouped = {};
    
    results.forEach(result => {
      const category = result.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    });
    
    return grouped;
  }

  /**
   * Calculate average quality score
   */
  calculateAverageQuality(results) {
    if (results.length === 0) return 0;
    
    const totalQuality = results.reduce((sum, result) => sum + result.qualityScore, 0);
    return Math.round(totalQuality / results.length);
  }

  /**
   * Get confidence distribution
   */
  getConfidenceDistribution(results) {
    const distribution = { high: 0, medium: 0, low: 0 };
    
    results.forEach(result => {
      distribution[result.confidence]++;
    });
    
    return distribution;
  }

  /**
   * Create error output
   */
  createErrorOutput(originalResults, error) {
    return {
      search: {
        id: originalResults.searchId || 'unknown',
        query: originalResults.query || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      results: {
        total: 0,
        items: [],
        error: 'Processing failed'
      },
      metadata: {
        processingTime: Date.now(),
        error: error.message
      }
    };
  }
}

// Create singleton instance
const resultsProcessor = new ResultsProcessor();

module.exports = {
  ResultsProcessor,
  resultsProcessor
}; 