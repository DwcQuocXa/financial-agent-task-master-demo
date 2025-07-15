/**
 * Firecrawl Configuration Module
 * 
 * Handles environment variable loading and Firecrawl API configuration.
 * 
 * Required Environment Variables:
 * - FIRECRAWL_API_KEY: Your Firecrawl API key
 * - FIRECRAWL_MAX_PAGES: Maximum pages to crawl (default: 5)
 * - FIRECRAWL_TIMEOUT: Request timeout in milliseconds (default: 60000)
 * - FIRECRAWL_MAX_RETRIES: Maximum retry attempts (default: 3)
 */

require('dotenv').config();

// Configuration object with defaults
const config = {
  apiKey: process.env.FIRECRAWL_API_KEY,
  maxPages: parseInt(process.env.FIRECRAWL_MAX_PAGES) || 5,
  timeout: parseInt(process.env.FIRECRAWL_TIMEOUT) || 60000, // 60 seconds
  maxRetries: parseInt(process.env.FIRECRAWL_MAX_RETRIES) || 3,
  waitFor: parseInt(process.env.FIRECRAWL_WAIT_FOR) || 3000, // 3 seconds wait
  extractorOptions: {
    mode: process.env.FIRECRAWL_EXTRACTOR_MODE || 'llm-extraction',
    extractorPrompt: process.env.FIRECRAWL_EXTRACTOR_PROMPT || 'Extract the main content, focusing on financial data, news, and key information relevant to the search query.',
  },
  crawlerOptions: {
    includes: process.env.FIRECRAWL_INCLUDES?.split(',') || [],
    excludes: process.env.FIRECRAWL_EXCLUDES?.split(',') || ['*/privacy*', '*/terms*', '*/cookie*'],
    returnOnlyUrls: process.env.FIRECRAWL_RETURN_ONLY_URLS === 'true' || false,
    maxDepth: parseInt(process.env.FIRECRAWL_MAX_DEPTH) || 2,
  }
};

/**
 * Validates that all required environment variables are present
 * @returns {Object} Validation result with isValid boolean and error message
 */
function validateFirecrawlConfig() {
  const errors = [];

  if (!config.apiKey) {
    errors.push('FIRECRAWL_API_KEY is required');
  }

  if (config.apiKey === 'your_firecrawl_api_key_here') {
    errors.push('Please set a valid FIRECRAWL_API_KEY (not the placeholder value)');
  }

  if (config.maxPages < 1 || config.maxPages > 100) {
    errors.push('FIRECRAWL_MAX_PAGES must be between 1 and 100');
  }

  if (config.timeout < 5000 || config.timeout > 300000) {
    errors.push('FIRECRAWL_TIMEOUT must be between 5000ms and 300000ms');
  }

  if (config.maxRetries < 1 || config.maxRetries > 10) {
    errors.push('FIRECRAWL_MAX_RETRIES must be between 1 and 10');
  }

  if (config.crawlerOptions.maxDepth < 1 || config.crawlerOptions.maxDepth > 5) {
    errors.push('FIRECRAWL_MAX_DEPTH must be between 1 and 5');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

/**
 * Gets the configuration for Firecrawl client initialization
 * @returns {Object} Configuration object
 * @throws {Error} If configuration is invalid
 */
function getFirecrawlConfig() {
  const validation = validateFirecrawlConfig();
  
  if (!validation.isValid) {
    const errorMessage = `Firecrawl configuration errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }

  return validation.config;
}

/**
 * Logs the current configuration (without exposing sensitive data)
 */
function logFirecrawlConfigStatus() {
  const hasApiKey = !!config.apiKey && config.apiKey !== 'your_firecrawl_api_key_here';
  
  console.log('[FIRECRAWL-CONFIG] Configuration status:');
  console.log(`  Max Pages: ${config.maxPages}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Max Retries: ${config.maxRetries}`);
  console.log(`  Wait For: ${config.waitFor}ms`);
  console.log(`  Max Depth: ${config.crawlerOptions.maxDepth}`);
  console.log(`  Extractor Mode: ${config.extractorOptions.mode}`);
  console.log(`  API Key: ${hasApiKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  
  if (config.crawlerOptions.excludes.length > 0) {
    console.log(`  Excludes: ${config.crawlerOptions.excludes.join(', ')}`);
  }
  
  if (!hasApiKey) {
    console.log('\n[FIRECRAWL-CONFIG] 💡 To get your API key:');
    console.log('  1. Visit: https://www.firecrawl.dev/');
    console.log('  2. Sign up and get your API key');
    console.log('  3. Add FIRECRAWL_API_KEY=your_key_here to your .env file');
  }
}

module.exports = {
  config,
  validateFirecrawlConfig,
  getFirecrawlConfig,
  logFirecrawlConfigStatus
}; 