/**
 * Advanced Prompt Engineering for Travel Assistant
 * 
 * Key Techniques Implemented:
 * 1. Chain-of-Thought (CoT) reasoning for complex queries
 * 2. Few-shot examples for consistent response format
 * 3. Context-aware prompt injection
 * 4. Hallucination prevention through explicit constraints
 * 5. Dynamic prompt assembly based on query type
 */

export class PromptEngineer {
  /**
   * System prompt with explicit role definition and constraints
   * Focuses on natural conversation and avoiding hallucinations
   */
  static getSystemPrompt() {
    return `You are an expert travel assistant with deep knowledge of global destinations, travel planning, and cultural insights. Your role is to provide helpful, accurate, and personalized travel advice.

CORE PRINCIPLES:
1. Be conversational and friendly, but concise
2. Ask clarifying questions when needed to provide better recommendations
3. If you don't know something with certainty, say so - don't make up information
4. Use external data (weather, country info) when provided to enhance your responses
5. Remember context from previous messages in the conversation
6. Prioritize practical, actionable advice

RESPONSE GUIDELINES:
- Keep responses between 2-4 paragraphs unless more detail is requested
- Use bullet points for lists (destinations, packing items, attractions)
- Include practical tips (best time to visit, budget considerations, safety)
- When suggesting destinations, explain WHY they match the user's interests
- For packing advice, consider the climate, activities, and duration

IMPORTANT: If real-time data (weather, events) is provided in the context, prioritize it over general knowledge. If no data is provided and the question requires current information, acknowledge the limitation.`;
  }

  /**
   * Chain-of-Thought prompt for destination recommendations
   * Guides the LLM through multi-step reasoning process
   */
  static getDestinationRecommendationPrompt(userQuery, context = {}) {
    const { budget, travelStyle, season, interests, previousDestinations } = context;

    return `Let's think through the best destination recommendation step by step:

USER QUERY: "${userQuery}"

STEP 1 - ANALYZE USER PREFERENCES:
First, identify what the user is looking for:
- Budget level: ${budget || 'not specified'}
- Travel style: ${travelStyle || 'not specified'}
- Season/timing: ${season || 'not specified'}
- Interests: ${interests || 'to be determined from query'}
- Previously discussed: ${previousDestinations || 'none'}

STEP 2 - CONSIDER FACTORS:
Think about these factors:
- Climate and weather during their travel period
- Cultural events and peak/off-peak seasons
- Budget alignment with destination costs
- Safety and accessibility
- Unique experiences matching their interests

STEP 3 - GENERATE OPTIONS:
Come up with 2-3 destination options that match their criteria, considering variety in:
- Geographic diversity
- Experience type (adventure, relaxation, culture, etc.)
- Budget range

STEP 4 - PROVIDE RECOMMENDATION:
Present your recommendations with:
- Clear reasoning for each suggestion
- Specific highlights that match their interests
- Practical considerations (best time, budget estimate, tips)

Now provide your recommendations in a natural, conversational way:`;
  }

  /**
   * Structured prompt for packing suggestions
   * Uses constraint-based approach to ensure comprehensive lists
   */
  static getPackingPrompt(destination, duration, activities, weatherData = null) {
    let weatherContext = '';
    if (weatherData) {
      weatherContext = `
CURRENT WEATHER DATA:
- Temperature: ${weatherData.temp}°C
- Conditions: ${weatherData.description}
- Humidity: ${weatherData.humidity}%
- Expected weather: ${weatherData.forecast || 'similar conditions'}
`;
    }

    return `Create a comprehensive packing list for a trip with these details:

TRIP DETAILS:
- Destination: ${destination}
- Duration: ${duration}
- Planned activities: ${activities}
${weatherContext}

PACKING CATEGORIES TO CONSIDER:
1. Clothing (weather-appropriate, layering, activity-specific)
2. Essentials (documents, money, electronics)
3. Toiletries and health (medications, sun protection, first aid)
4. Activity-specific gear
5. Optional but recommended items

APPROACH:
- Prioritize versatile items that can be mixed and matched
- Consider the local culture and dress codes
- Balance between packing light and being prepared
- Include quantities where relevant
- Flag items that can be purchased at destination vs must-bring

Provide the packing list in a clear, organized format with brief explanations for non-obvious items.`;
  }

  /**
   * Local attractions and activities prompt
   * Focuses on personalization and practical information
   */
  static getAttractionsPrompt(destination, interests, countryData = null) {
    let countryContext = '';
    if (countryData) {
      countryContext = `
DESTINATION CONTEXT:
- Capital: ${countryData.capital}
- Languages: ${countryData.languages?.join(', ')}
- Currency: ${countryData.currency}
- Region: ${countryData.region}
- Popular for: ${countryData.highlights || 'various attractions'}
`;
    }

    return `Recommend local attractions and activities for:

DESTINATION: ${destination}
USER INTERESTS: ${interests}
${countryContext}

RECOMMENDATION CRITERIA:
1. Mix of popular must-sees and hidden gems
2. Variety of experience types (cultural, nature, food, adventure)
3. Consider different budget levels
4. Include practical info: typical duration, best time to visit, booking tips
5. Suggest a logical order or grouping (by area, by day, etc.)

STRUCTURE YOUR RESPONSE:
- Group attractions by type or area
- For each suggestion, explain why it matches their interests
- Include 1-2 insider tips
- Mention any seasonal considerations
- Suggest approximate time needed

Provide 5-7 well-chosen recommendations rather than an exhaustive list.`;
  }

  /**
   * Context-aware follow-up prompt
   * Maintains conversation coherence
   */
  static getFollowUpPrompt(conversationHistory, newQuery) {
    const recentContext = conversationHistory.slice(-4).map(msg => 
      `${msg.role}: ${msg.content.substring(0, 200)}...`
    ).join('\n');

    return `CONVERSATION CONTEXT:
${recentContext}

NEW USER QUERY: "${newQuery}"

INSTRUCTIONS:
- Reference relevant information from the conversation history
- Build upon previous recommendations naturally
- If the query is unrelated to previous context, it's okay to shift topics smoothly
- Maintain the same helpful, conversational tone
- If the user is asking for clarification or more details, focus your response specifically on that aspect

Respond to the user's query:`;
  }

  /**
   * Error recovery prompt for handling confused or incomplete LLM responses
   */
  static getErrorRecoveryPrompt(originalQuery, problematicResponse) {
    return `The previous response was unclear or incomplete. Let's try again with more focus.

ORIGINAL USER QUESTION: "${originalQuery}"

PREVIOUS RESPONSE HAD ISSUES: ${problematicResponse ? 'Too vague or off-topic' : 'No response'}

Please provide a clear, focused answer that:
1. Directly addresses the user's question
2. Gives specific, actionable information
3. Stays on topic
4. Admits uncertainty if you don't have reliable information

Provide your improved response:`;
  }

  /**
   * Hallucination detection prompt
   * Used to verify if LLM response contains made-up information
   */
  static getHallucinationCheckPrompt(response, factualContext = null) {
    return `Review this travel advice for accuracy:

RESPONSE TO CHECK:
"${response}"

${factualContext ? `KNOWN FACTS:\n${factualContext}` : ''}

Does this response contain any:
1. Made-up specific facts (fake hotel names, wrong dates, fabricated statistics)?
2. Overly confident claims without qualification?
3. Information that contradicts the provided facts?

Answer with: "VERIFIED" if the response seems reasonable and appropriately qualified, or "CONCERNS: [specific issues]" if there are problems.`;
  }

  /**
   * Data augmentation prompt - blending external API data with LLM knowledge
   */
  static getDataAugmentedPrompt(query, externalData) {
    const dataContext = Object.entries(externalData)
      .map(([source, data]) => `${source.toUpperCase()}: ${JSON.stringify(data, null, 2)}`)
      .join('\n\n');

    return `Answer the user's query using both your knowledge and the provided real-time data.

USER QUERY: "${query}"

REAL-TIME DATA:
${dataContext}

INSTRUCTIONS:
- Blend the external data naturally into your response
- Use the data to provide specific, current information
- Supplement the data with your general knowledge about the destination
- If data is missing or limited, acknowledge it and provide general guidance
- Make your response conversational, not a data dump

Provide your response:`;
  }

  /**
   * Determine query type and select appropriate prompt strategy
   */
  static classifyQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.match(/where|destination|recommend|suggest|place|country|city|visit/)) {
      return 'destination_recommendation';
    }
    if (lowerQuery.match(/pack|bring|luggage|suitcase|clothes|clothing|what to wear/)) {
      return 'packing';
    }
    if (lowerQuery.match(/do|see|activity|activities|attraction|things|visit|experience/)) {
      return 'attractions';
    }
    if (lowerQuery.match(/weather|climate|temperature|rain|season/)) {
      return 'weather';
    }
    if (lowerQuery.match(/budget|cost|price|expensive|cheap|afford/)) {
      return 'budget';
    }
    if (lowerQuery.match(/food|restaurant|eat|cuisine|drink/)) {
      return 'food';
    }
    
    return 'general';
  }

  /**
   * Build complete prompt based on query type and available context
   */
  static buildPrompt(query, queryType, context = {}) {
    const { conversationHistory = [], externalData = {}, userPreferences = {} } = context;

    // If it's a follow-up in an existing conversation
    if (conversationHistory.length > 0) {
      const basePrompt = this.getFollowUpPrompt(conversationHistory, query);
      
      // Add external data if available
      if (Object.keys(externalData).length > 0) {
        return this.getDataAugmentedPrompt(query, externalData);
      }
      
      return basePrompt;
    }

    // First message - use specialized prompt based on query type
    switch (queryType) {
      case 'destination_recommendation':
        return this.getDestinationRecommendationPrompt(query, userPreferences);
      
      case 'packing':
        const { destination, duration, activities } = userPreferences;
        const weatherData = externalData.weather;
        return this.getPackingPrompt(destination, duration, activities, weatherData);
      
      case 'attractions':
        const dest = userPreferences.destination;
        const interests = userPreferences.interests;
        const countryData = externalData.country;
        return this.getAttractionsPrompt(dest, interests, countryData);
      
      default:
        // For general queries, use data augmentation if available
        if (Object.keys(externalData).length > 0) {
          return this.getDataAugmentedPrompt(query, externalData);
        }
        // Otherwise, just the query with system prompt
        return query;
    }
  }
}

export default PromptEngineer;
