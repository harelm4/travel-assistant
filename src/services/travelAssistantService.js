/**
 * Travel Assistant Service - Main orchestration layer
 * Coordinates LLM, external APIs, prompts, and conversation management
 */

import { PromptEngineer } from '../prompts/promptEngineer.js';
import { LLMService } from './llmService.js';
import { ExternalAPIService } from './externalAPIService.js';
import { ConversationManager } from './conversationManager.js';

export class TravelAssistantService {
  constructor(config) {
    this.llmService = new LLMService(config.llm);
    this.externalAPIService = new ExternalAPIService(config.externalAPIs);
    this.conversationManager = new ConversationManager();
    this.maxRetries = 2;
  }

  async chat(conversationId, userMessage) {
    try {
      let conversation = this.conversationManager.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found. Please start a new conversation.');
      }
      this.conversationManager.extractAndStoreContext(conversationId, userMessage);
      this.conversationManager.addMessage(conversationId, 'user', userMessage);

      // Classify the query type
      const queryType = PromptEngineer.classifyQuery(userMessage);

      // Determine if we need external data
      const dataNeeds = ExternalAPIService.shouldFetchData(userMessage, queryType);
      const externalData = await this.fetchExternalData(userMessage, dataNeeds, conversation);

      // Build the prompt
      const conversationHistory = this.conversationManager.getFormattedHistory(conversationId)
        .filter(m => m.role !== 'system'); // Exclude system messages from history
      
      const userPreferences = {
        ...conversation.context.userPreferences,
        ...conversation.context.extractedInfo,
      };

      const userPrompt = PromptEngineer.buildPrompt(userMessage, queryType, {
        conversationHistory: conversationHistory.slice(0, -1), // Exclude current message
        externalData: externalData,
        userPreferences: userPreferences,
      });

      // Generate response with retry logic
      let response = await this.generateWithRetry(conversationId, userPrompt);

      // Check for hallucinations or poor responses
      const validated = await this.validateResponse(response, externalData);
      if (!validated.ok && validated.retry) {
        console.log('Response validation failed, retrying with error recovery prompt');
        const recoveryPrompt = PromptEngineer.getErrorRecoveryPrompt(userMessage, response);
        response = await this.generateWithRetry(conversationId, recoveryPrompt);
      }

      // Add assistant response to conversation
      this.conversationManager.addMessage(conversationId, 'assistant', response, {
        queryType: queryType,
        externalDataUsed: Object.keys(externalData).length > 0,
      });

      return {
        response: response,
        conversationId: conversationId,
        queryType: queryType,
        externalDataUsed: Object.keys(externalData),
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  /**
   * Generate LLM response with retry logic
   */
  async generateWithRetry(conversationId, userPrompt, attempt = 0) {
    try {
      const systemPrompt = PromptEngineer.getSystemPrompt();
      const conversationHistory = this.conversationManager.getFormattedHistory(conversationId);
      
      // Build messages array for LLM
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.filter(m => m.role !== 'system'),
        { role: 'user', content: userPrompt },
      ];

      // Remove duplicate consecutive messages
      const dedupedMessages = this.deduplicateMessages(messages);

      const result = await this.llmService.generateChatResponse(dedupedMessages, {
        temperature: 0.7,
        max_tokens: 1000,
      });

      return result.content;

    } catch (error) {
      if (attempt < this.maxRetries) {
        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries}`);
        await this.delay(1000 * (attempt + 1)); // Exponential backoff
        return this.generateWithRetry(conversationId, userPrompt, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Fetch external data based on query needs
   */
  async fetchExternalData(query, dataNeeds, conversation) {
    const externalData = {};

    // Extract location from query or conversation context
    const location = ExternalAPIService.extractLocation(query) || 
                     conversation.context.extractedInfo.destinations?.[conversation.context.extractedInfo.destinations.length - 1];

    if (!location) {
      return externalData; // No location found, can't fetch data
    }

    try {
      // Fetch weather data if needed
      if (dataNeeds.weather) {
        const weather = await this.externalAPIService.getWeather(location);
        if (weather) {
          externalData.weather = weather;
        }
      }

      // Fetch country data if needed
      if (dataNeeds.country) {
        const country = await this.externalAPIService.getCountryInfo(location);
        if (country) {
          externalData.country = country;
        }
      }
    } catch (error) {
      console.error('Error fetching external data:', error.message);
      // Continue without external data rather than failing
    }

    return externalData;
  }

  /**
   * Validate LLM response for quality and accuracy
   */
  async validateResponse(response, externalData) {
    // Basic validation checks
    const checks = {
      ok: true,
      retry: false,
      issues: [],
    };

    // Check if response is too short (likely incomplete)
    if (response.length < 50) {
      checks.ok = false;
      checks.retry = true;
      checks.issues.push('Response too short');
      return checks;
    }

    // Check if response is just repeating the question
    if (response.toLowerCase().includes('your question') || 
        response.toLowerCase().includes('you asked')) {
      checks.ok = false;
      checks.retry = true;
      checks.issues.push('Response is meta-commentary');
      return checks;
    }

    // Check for common hallucination patterns
    const hallucinationPatterns = [
      /according to my database/i,
      /as of my last update/i,
      /I have access to/i,
    ];

    for (const pattern of hallucinationPatterns) {
      if (pattern.test(response)) {
        checks.issues.push('Potential hallucination pattern detected');
        // Don't auto-retry for this, but flag it
      }
    }

    return checks;
  }

  /**
   * Remove duplicate consecutive messages
   */
  deduplicateMessages(messages) {
    const deduped = [];
    let lastContent = null;

    for (const msg of messages) {
      if (msg.content !== lastContent) {
        deduped.push(msg);
        lastContent = msg.content;
      }
    }

    return deduped;
  }

  /**
   * Start a new conversation
   */
  startConversation(userId = 'anonymous') {
    const conversationId = this.conversationManager.createConversation(userId);
    
    // Add system prompt to conversation
    const systemPrompt = PromptEngineer.getSystemPrompt();
    this.conversationManager.addMessage(conversationId, 'system', systemPrompt);

    return {
      conversationId: conversationId,
      message: 'New conversation started',
    };
  }

  /**
   * Get conversation history
   */
  getConversationHistory(conversationId) {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    return {
      conversationId: conversationId,
      messages: conversation.messages.filter(m => m.role !== 'system'), // Don't expose system prompts
      context: conversation.context,
      createdAt: conversation.createdAt,
      lastActivity: conversation.lastActivity,
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    const llmHealth = await this.llmService.healthCheck();
    const stats = this.conversationManager.getStats();

    return {
      llm: llmHealth,
      conversations: stats,
      timestamp: new Date(),
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TravelAssistantService;
