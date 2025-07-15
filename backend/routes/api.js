const express = require('express');
const router = express.Router();

// Chat routes
router.use('/chat', require('./chat'));

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Financial Agent Demo API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
    },
    documentation: 'https://github.com/your-repo/financial-agent-demo#api',
  });
});

module.exports = router; 