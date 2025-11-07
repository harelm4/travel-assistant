import { v4 as uuidv4 } from 'uuid';

export class ConversationManager {
  constructor() {
    this.conversations = new Map();
    this.maxHistoryLength = 20; // Keep last 20 messages
  }

  createConversation(userId = 'anonymous') {
    const conversationId = uuidv4();
    const conversation = {
      id: conversationId,
      userId: userId,
      messages: [],
      context: {
        userPreferences: {},
        extractedInfo: {},
      },
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.conversations.set(conversationId, conversation);
    return conversationId;
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  addMessage(conversationId, role , content, metadata = {}) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const message = {
      role: role, // 'user' or 'assistant' or 'system'
      content: content,
      timestamp: new Date(),
      ...metadata,
    };

    conversation.messages.push(message);
    conversation.lastActivity = new Date();

    if (conversation.messages.length > this.maxHistoryLength) {
      const systemMessages = conversation.messages.filter(m => m.role === 'system');
      const recentMessages = conversation.messages
        .filter(m => m.role !== 'system')
        .slice(-this.maxHistoryLength + systemMessages.length);
      
      conversation.messages = [...systemMessages, ...recentMessages];
    }

    return message;
  }


  getFormattedHistory(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return [];
    }

    return conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  updatePreferences(conversationId, preferences) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    conversation.context.userPreferences = {
      ...conversation.context.userPreferences,
      ...preferences,
    };
  }

  extractAndStoreContext(conversationId, userMessage) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return;
    }

    const lowerMessage = userMessage.toLowerCase();
    const context = conversation.context.extractedInfo;

    // Extract budget information
    if (lowerMessage.match(/budget|afford|spend|\$/)) {
      const budgetMatch = lowerMessage.match(/(\d+)\s*(?:dollars?|\$|usd|euro|eur)/i);
      if (budgetMatch) {
        context.budget = budgetMatch[1];
      } else if (lowerMessage.includes('budget')) {
        context.budgetMentioned = true;
      }
    }

    // Extract duration
    const durationMatch = lowerMessage.match(/(\d+)\s*(?:day|week|month|night)/i);
    if (durationMatch) {
      context.duration = durationMatch[0];
    }

    // Extract destination mentions
    const destinationMatch = userMessage.match(/\b([A-Z][a-zA-Z\s]+?)(?=\s+(?:weather|trip|visit|in|to)\b|\.|,|$)/);
    if (destinationMatch) {
      if (!context.destinations) {
        context.destinations = [];
      }
      context.destinations.push(destinationMatch[1].trim());
    }

    // Extract travel style keywords
    const travelStyles = ['adventure', 'relaxation', 'luxury', 'budget', 'backpack', 'family', 'solo', 'romantic'];
    for (const style of travelStyles) {
      if (lowerMessage.includes(style)) {
        if (!context.travelStyles) {
          context.travelStyles = [];
        }
        context.travelStyles.push(style);
      }
    }

    // Extract interests
    const interests = ['culture', 'history', 'food', 'nature', 'beach', 'mountain', 'city', 'nightlife', 'shopping', 'art', 'architecture'];
    for (const interest of interests) {
      if (lowerMessage.includes(interest)) {
        if (!context.interests) {
          context.interests = [];
        }
        context.interests.push(interest);
      }
    }
  }

  getUserConversations(userId) {
    const userConversations = [];
    for (const [id, conv] of this.conversations.entries()) {
      if (conv.userId === userId) {
        userConversations.push({
          id: id,
          createdAt: conv.createdAt,
          lastActivity: conv.lastActivity,
          messageCount: conv.messages.length,
          preview: conv.messages[conv.messages.length - 1]?.content.substring(0, 100),
        });
      }
    }
    return userConversations;
  }

  cleanupOldConversations(maxAgeHours = 24) {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    for (const [id, conv] of this.conversations.entries()) {
      if (conv.lastActivity < cutoff) {
        this.conversations.delete(id);
      }
    }
  }

  deleteConversation(conversationId) {
    return this.conversations.delete(conversationId);
  }

  getStats() {
    return {
      totalConversations: this.conversations.size,
      activeConversations: Array.from(this.conversations.values())
        .filter(c => c.lastActivity > new Date(Date.now() - 60 * 60 * 1000)).length,
    };
  }
}

export default ConversationManager;
