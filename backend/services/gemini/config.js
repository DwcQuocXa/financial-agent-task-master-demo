/**
 * Gemini Configuration Module
 * 
 * Handles environment variable loading and Gemini model configuration.
 * 
 * Required Environment Variables:
 * - GOOGLE_API_KEY: Your Google API key (get from https://aistudio.google.com/app/apikey)
 * - GEMINI_MODEL: Model name (default: gemini-2.0-flash)
 * - GEMINI_TEMPERATURE: Temperature for responses (default: 0.7)
 * - GEMINI_MAX_TOKENS: Maximum tokens (default: 2048)
 */

require('dotenv').config();

// Configuration object with defaults
const config = {
  googleApiKey: process.env.GOOGLE_API_KEY,
  model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
  maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 2048,
};

/**
 * Validates that all required environment variables are present
 * @returns {Object} Validation result with isValid boolean and error message
 */
function validateConfig() {
  const errors = [];

  if (!config.googleApiKey) {
    errors.push('GOOGLE_API_KEY is required');
  }

  if (config.googleApiKey === 'your_google_api_key_here') {
    errors.push('Please set a valid GOOGLE_API_KEY (not the placeholder value)');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    errors.push('GEMINI_TEMPERATURE must be between 0 and 2');
  }

  if (config.maxTokens < 1 || config.maxTokens > 8192) {
    errors.push('GEMINI_MAX_TOKENS must be between 1 and 8192');
  }

  return {
    isValid: errors.length === 0,
    errors,
    config
  };
}

/**
 * Gets the configuration for Gemini model initialization
 * @returns {Object} Configuration object
 * @throws {Error} If configuration is invalid
 */
function getGeminiConfig() {
  const validation = validateConfig();
  
  if (!validation.isValid) {
    const errorMessage = `Gemini configuration errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
    throw new Error(errorMessage);
  }

  return validation.config;
}

/**
 * Logs the current configuration (without exposing sensitive data)
 */
function logConfigStatus() {
  const hasApiKey = !!config.googleApiKey && config.googleApiKey !== 'your_google_api_key_here';
  
  console.log('[GEMINI-CONFIG] Configuration status:');
  console.log(`  Model: ${config.model}`);
  console.log(`  Temperature: ${config.temperature}`);
  console.log(`  Max Tokens: ${config.maxTokens}`);
  console.log(`  API Key: ${hasApiKey ? '✅ Configured' : '❌ Missing or placeholder'}`);
  
  if (!hasApiKey) {
    console.log('\n[GEMINI-CONFIG] 💡 To get your API key:');
    console.log('  1. Visit: https://aistudio.google.com/app/apikey');
    console.log('  2. Create a new API key');
    console.log('  3. Add GOOGLE_API_KEY=your_key_here to your .env file');
  }
}

module.exports = {
  config,
  validateConfig,
  getGeminiConfig,
  logConfigStatus
}; 