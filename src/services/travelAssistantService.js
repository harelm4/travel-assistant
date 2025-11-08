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

      const queryType = PromptEngineer.classifyQuery(userMessage);

      const dataNeeds = ExternalAPIService.shouldFetchExternalData(userMessage, queryType);
      const externalData = await this.fetchExternalData(userMessage, dataNeeds, conversation);

      const conversationHistory = this.conversationManager.getFormattedHistory(conversationId)
        .filter(m => m.role !== 'system');
      
      const userPreferences = {
        ...conversation.context.userPreferences,
        ...conversation.context.extractedInfo,
      };

      const userPrompt = PromptEngineer.buildPrompt(userMessage, queryType, {
        conversationHistory: conversationHistory.slice(0, -1),
        externalData: externalData,
        userPreferences: userPreferences,
      });

      let response = await this.generateChatResponseWithRetry(conversationId, userPrompt);

      const validated = await this.validateResponse(response, externalData);
      if (validated.retry) {
        console.log('Response validation failed, retrying with error recovery prompt');
        const recoveryPrompt = PromptEngineer.getErrorRecoveryPrompt(userMessage, response,validated.issues);
        response = await this.generateChatResponseWithRetry(conversationId, recoveryPrompt);
      }

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


  async generateChatResponseWithRetry(conversationId, userPrompt, attempt = 0) {
    // sometimes LLM calls fail due to technical issues on the model side, therefore we need a retry mechanism
    try {
      const systemPrompt = PromptEngineer.getSystemPrompt();
      const conversationHistory = this.conversationManager.getFormattedHistory(conversationId);
      
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.filter(m => m.role !== 'system'),
        { role: 'user', content: userPrompt },
      ];

      const uniqueMessages = this.removeDuplicateMessages(messages);

      const result = await this.llmService.generateChatResponse(uniqueMessages, {
        temperature: 0.7,
        max_tokens: 1000,
      });

      return result.content;

    } catch (error) {
      if (attempt < this.maxRetries) {
        console.log(`Retry attempt ${attempt + 1}/${this.maxRetries} : ${error.message}`);
        await this.delay(1000 * (attempt + 1)); 
        return this.generateChatResponseWithRetry(conversationId, userPrompt, attempt + 1);
      }
      throw error;
    }
  }
  async getLocation(query) {
    // another way to extract data from query is to just ask the LLM to do it - risky but sometimes effective
    try {
      const locationPrompt = PromptEngineer.getLocationExtractionPrompt(query);
      const locationMessages = [{ role: 'user', content: locationPrompt }];
      const location = (await this.llmService.generateChatResponse(locationMessages)).content;
      return location.includes('UNKNOWN') ? null : location;
    } catch (error) {
      console.error('Error extracting location:', error.message);
      return null;
    }
  }

  async fetchExternalData(query, dataNeeds, conversation) {
    const externalData = {};
    const location = await this.getLocation(query);


    if (!location) {
      return externalData; 
    }

    try {
      if (dataNeeds.weather) {
        const weather = await this.externalAPIService.getWeather(location);
        if (weather) {
          externalData.weather = weather;
        }
      }

      if (dataNeeds.country) {
        const country = await this.externalAPIService.getCountryInfo(location);
        if (country) {
          externalData.country = country;
        }
      }
    } catch (error) {
      console.error('Error fetching external data:', error.message);
    }

    return externalData;
  }

  async validateResponse(response, externalData) {
    const checks = {
      retry: false,
      issues: [],
    };

    // Check if response is too short (likely incomplete)
    if (response.length < 50) {
      checks.retry = true;
      checks.issues.push('Response too short');
      return checks;
    }

    // Check if response is just repeating the question - often happens when the model is confused
    if (response.toLowerCase().includes('your question') || 
        response.toLowerCase().includes('you asked')) {
      checks.retry = true;
      checks.issues.push('Response is meta-commentary');
      return checks;
    }

    // Check for common hallucination patterns
    const hallucinationPatterns = [
      /I think/i,
      /probably/i,
      /it might be/i,
    ];

    for (const pattern of hallucinationPatterns) {
      if (pattern.test(response)) {
        checks.issues.push('Potential hallucination pattern detected');
        // Don't auto-retry for this, but flag it
      }
    }

    return checks;
  }

  removeDuplicateMessages(messages) {
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

  async healthCheck() {
    const llmHealth = await this.llmService.healthCheck();
    const stats = this.conversationManager.getStats();

    return {
      llm: llmHealth,
      conversations: stats,
      timestamp: new Date(),
    };
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default TravelAssistantService;
