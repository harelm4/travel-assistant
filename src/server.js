/**
 * Express REST API for Travel Assistant
 */

import express from 'express';
import dotenv from 'dotenv';
import { TravelAssistantService } from './services/travelAssistantService.js';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());


// CORS middleware (allow all origins for testing)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize Travel Assistant Service
const travelAssistant = new TravelAssistantService({
  llm: {
    provider: process.env.LLM_PROVIDER || 'ollama',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  },
  externalAPIs: {
    weatherApiKey: process.env.OPENWEATHER_API_KEY,
  },
});

// Routes

app.get('/api/health', async (req, res) => {
  try {
    const health = await travelAssistant.healthCheck();
    res.status(health.llm.available ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date(),
    });
  }
});


app.post('/api/conversations', (req, res) => {
  try {
    const { userId } = req.body;
    const result = travelAssistant.startConversation(userId);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to start conversation',
      message: error.message,
    });
  }
});


app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Message is required and must be a non-empty string',
      });
    }
    const health = await travelAssistant.healthCheck();
    if (!health.llm.available) {
      return res.status(503).json({
        error: 'LLM service unavailable',
        message: health.message,
      });
    }
    

    const result = await travelAssistant.chat(id, message);
    res.json(result);

  } catch (error) {
    console.error('Chat error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: 'Please start a new conversation first',
      });
    }

    res.status(500).json({
      error: 'Failed to process message',
      message: error.message,
    });
  }
});


app.get('/api/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const history = travelAssistant.getConversationHistory(id);
    res.json(history);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Conversation not found',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve conversation',
      message: error.message,
    });
  }
});


app.post('/api/conversations/:id/reset', (req, res) => {
  try {
    const { id } = req.params;
    const conversation = travelAssistant.conversationManager.getConversation(id);
    
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    // Clear messages except system prompt
    conversation.messages = conversation.messages.filter(m => m.role === 'system');
    conversation.context = {
      userPreferences: {},
      extractedInfo: {},
    };

    res.json({
      message: 'Conversation reset',
      conversationId: id,
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset conversation',
      message: error.message,
    });
  }
});


app.delete('/api/conversations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = travelAssistant.conversationManager.deleteConversation(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Conversation not found',
      });
    }

    res.json({
      message: 'Conversation deleted',
      conversationId: id,
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to delete conversation',
      message: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Travel Assistant API is running!`);
  console.log(`URL: http://localhost:${PORT}`);
  // console.log(`\n📚 API Endpoints:`);
  // console.log(`   GET  / - API information`);
  // console.log(`   GET  /api/health - Health check`);
  // console.log(`   POST /api/conversations - Start new conversation`);
  // console.log(`   POST /api/conversations/:id/messages - Send message`);
  // console.log(`   GET  /api/conversations/:id - Get history`);
});

export default app;
