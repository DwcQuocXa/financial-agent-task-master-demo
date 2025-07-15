/**
 * Perplexity AI Configuration Module
 * 
 * Handles environment variable loading and Perplexity API configuration.
 * 
 * Required Environment Variables:
 * - PERPLEXITY_API_KEY: Your Perplexity API key
 * - PERPLEXITY_MODEL: Model name (default: sonar)
 * - PERPLEXITY_TEMPERATURE: Temperature for responses (default: 0.3)
 * - PERPLEXITY_MAX_TOKENS: Maximum tokens (default: 1000)
 */

require('dotenv').config();

// Configuration object with defaults
const config = {
  apiKey: process.env.PERPLEXITY_API_KEY,
  model: process.env.PERPLEXITY_MODEL || 'sonar',
  temperature: parseFloat(process.env.PERPLEXITY_TEMPERATURE) || 0.3,
  maxTokens: parseInt(process.env.PERPLEXITY_MAX_TOKENS) || 1000,
  timeout: parseInt(process.env.PERPLEXITY_TIMEOUT) || 30000, // 30 seconds
  maxRetries: parseInt(process.env.PERPLEXITY_MAX_RETRIES) || 3,
};

/**
 * Validates that all required environment variables are present
 * @returns {Object} Validation result with isValid boolean and error message
 */
function validatePerplexityConfig() {
  const errors = [];

  if (!config.apiKey) {
    errors.push('PERPLEXITY_API_KEY is required');
  }

  if (config.apiKey === 'your_perplexity_api_key_here') {
    errors.push('Please set a valid PERPLEXITY_API_KEY (not the placeholder value)');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('PERPLEXITY_TEMPERATURE must be between 0 and 2');
  }

  if (config.maxTokens < 1 || config.maxTokens > 4096) {
    errors.push('PERPLEXITY_MAX_TOKENS must be between 1 and 4096');
  }

  if (config.timeout < 1000 || config.timeout > 300000) {
    errors.push('PERPLEXITY_TIMEOUT must be between 1000ms and 300000ms');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

/**
 * Gets the configuration for Perplexity client initialization
 * @returns {Object} Configuration object
 * @throws {Error} If configuration is invalid
 */
function getPerplexityConfig() {
  const validation = validatePerplexityConfig();
  
  if (!validation.isValid) {
    const errorMessage = `Perplexity configuration errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }

  return validation.config;
}

/**
 * Logs the current configuration (without exposing sensitive data)
 */
function logPerplexityConfigStatus() {
  const hasApiKey = !!config.apiKey && config.apiKey !== 'your_perplexity_api_key_here';
  
  console.log('[PERPLEXITY-CONFIG] Configuration status:');
  console.log(`  Model: ${config.model}`);
  console.log(`  Temperature: ${config.temperature}`);
  console.log(`  Max Tokens: ${config.maxTokens}`);
  console.log(`  Timeout: ${config.timeout}ms`);
  console.log(`  Max Retries: ${config.maxRetries}`);
  console.log(`  API Key: ${hasApiKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  
  if (!hasApiKey) {
    console.log('\n[PERPLEXITY-CONFIG] 💡 To get your API key:');
    console.log('  1. Visit: https://www.perplexity.ai/settings/api');
    console.log('  2. Generate a new API key');
    console.log('  3. Add PERPLEXITY_API_KEY=your_key_here to your .env file');
  }
}

module.exports = {
  config,
  validatePerplexityConfig,
  getPerplexityConfig,
  logPerplexityConfigStatus
}; 