# Travel Assistant API

An AI-powered travel planning assistant that demonstrates advanced prompt engineering and natural conversational interactions with LLMs. The system handles multiple types of travel queries, maintains conversation context, integrates real-time data, and implements sophisticated error handling.

## 🌟 Key Features

### Conversation-First Design
- **Multiple Query Types**: Handles destination recommendations, packing suggestions, local attractions, weather queries, budget planning, and food recommendations
- **Context Management**: Maintains conversation history and extracts user preferences automatically
- **Natural Flow**: Designed for multi-turn conversations with follow-up questions

### Advanced Prompt Engineering
- **Chain-of-Thought Reasoning**: Guides the LLM through multi-step reasoning for complex recommendations
- **Dynamic Prompt Assembly**: Automatically selects appropriate prompts based on query type
- **Hallucination Prevention**: Explicit constraints and validation to minimize incorrect information
- **Context-Aware Prompts**: Blends conversation history with external data seamlessly

### External Data Integration
- **Weather API**: Real-time weather data from OpenWeatherMap
- **Country Information**: Comprehensive country data from REST Countries API
- **Smart Data Fetching**: Automatically determines when external data is needed

### Error Handling & Recovery
- **Retry Logic**: Automatic retries with exponential backoff
- **Response Validation**: Checks for incomplete or confused responses
- **Error Recovery Prompts**: Special prompts to guide LLM back on track
- **Graceful Degradation**: Continues working even if external APIs are unavailable

## 📋 Requirements

- **Node.js** 18+ (for native ES modules and watch mode)
- **LLM Provider**: Choose one:
  - **Ollama** (recommended for local development) - Free, runs locally
  - **DeepSeek** - Free tier available with API key
- **Optional**: OpenWeather API key for weather data (free tier available)

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Set Up LLM Provider

#### Option A: Ollama (Local - Recommended)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model:
```powershell
ollama pull llama3.2
```
3. Start Ollama (it usually runs automatically):
```powershell
ollama serve
```

#### Option B: DeepSeek (API)

1. Get a free API key from [DeepSeek](https://platform.deepseek.com/)
2. Configure in `.env` file (see step 3)

### 3. Configure Environment

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` with your settings:

```env
# Server
PORT=3000

# LLM Provider (choose one)
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# OR for DeepSeek:
# LLM_PROVIDER=deepseek
# DEEPSEEK_API_KEY=your_api_key_here

# Optional: Weather API
OPENWEATHER_API_KEY=your_key_here
```

### 4. Start the Server

```powershell
npm start
```

For development with auto-reload:
```powershell
npm run dev
```

The API will be available at `http://localhost:3000`

## 📡 API Endpoints

### Start a New Conversation

```http
POST /api/conversations
Content-Type: application/json

{
  "userId": "optional_user_id"
}
```

Response:
```json
{
  "conversationId": "uuid-here",
  "message": "New conversation started"
}
```

### Send a Message

```http
POST /api/conversations/{conversationId}/messages
Content-Type: application/json

{
  "message": "I want to visit Japan in spring. What should I know?"
}
```

Response:
```json
{
  "response": "Spring is an excellent time to visit Japan! Here's what you should know...",
  "conversationId": "uuid-here",
  "queryType": "destination_recommendation",
  "externalDataUsed": ["country", "weather"],
  "timestamp": "2025-11-07T..."
}
```

### Get Conversation History

```http
GET /api/conversations/{conversationId}
```

Response:
```json
{
  "conversationId": "uuid-here",
  "messages": [
    {
      "role": "user",
      "content": "I want to visit Japan in spring",
      "timestamp": "2025-11-07T..."
    },
    {
      "role": "assistant",
      "content": "Spring is an excellent time...",
      "timestamp": "2025-11-07T...",
      "queryType": "destination_recommendation"
    }
  ],
  "context": {
    "userPreferences": {},
    "extractedInfo": {
      "destinations": ["Japan"],
      "travelStyles": [],
      "interests": []
    }
  }
}
```

### Health Check

```http
GET /api/health
```

### Other Endpoints

- `POST /api/conversations/{id}/reset` - Clear conversation history
- `DELETE /api/conversations/{id}` - Delete conversation
- `GET /` - API information

## 💬 Sample Conversations

### Example 1: Destination Recommendation

**User:** "I'm looking for a beach destination for a relaxing 2-week vacation in December. Budget is around $3000."

**Assistant:** "Let me think through the best options for you step by step...

Based on your preferences for a relaxing beach vacation in December with a $3000 budget, here are my top recommendations:

**1. Playa del Carmen, Mexico**
- Perfect weather in December (avg 25°C/77°F)
- Great value for money - your budget will go far
- Beautiful beaches, cenotes, and Mayan ruins nearby
- Mix of relaxation and optional activities

**2. Bali, Indonesia**  
- December is just before peak season
- Incredible value - luxury resorts within budget
- Stunning beaches, rice terraces, and temples
- Excellent for wellness retreats

**3. Zanzibar, Tanzania**
- December is ideal (dry season)
- Pristine beaches, less crowded than Caribbean
- Rich culture and spice tours
- Budget stretches further here

For 2 weeks, I'd lean toward Bali or Zanzibar as you'll have time to explore beyond just the beach. Which type of atmosphere appeals more - bohemian/spiritual (Bali) or cultural/historical (Zanzibar)?"

**User:** "Bali sounds perfect! What should I pack?"

**Assistant:** "Great choice! For a 2-week Bali trip in December, here's your comprehensive packing list:

**CLOTHING** (lightweight, breathable fabrics)
- 5-7 t-shirts/tank tops
- 2-3 shorts
- 2-3 sundresses or light pants
- 1 light cardigan (for air-conditioned places)
- Swimsuits (2-3)
- Light cover-up for beaches
- 1 nicer outfit for temples/restaurants
- Comfortable walking sandals
- Flip-flops for beach
- Closed-toe shoes for temple visits

**ESSENTIALS**
- Passport (valid 6+ months)
- Travel insurance documents
- Credit cards + some USD cash
- Phone + charger (universal adapter needed)
- Sunglasses & hat

**HEALTH & TOILETRIES**
- SPF 50+ sunscreen (reef-safe)
- Insect repellent (dengue prevention)
- After-sun lotion
- Basic first-aid kit
- Any prescription medications
- Hand sanitizer

**BALI-SPECIFIC**
- Sarong (for temple visits - can buy there)
- Reusable water bottle
- Dry bag for water activities
- Light rain jacket (December can have brief showers)

**PRO TIPS:**
- Pack light - you can get laundry done cheaply
- Bring a scarf for temple visits
- Leave expensive jewelry at home
- Download offline maps

Would you like recommendations on which areas of Bali to stay in?"

### Example 2: Follow-up with Context

**User:** "I'm planning a trip to Paris"

**Assistant:** "Paris is wonderful! To give you the best recommendations, could you tell me:
- When are you planning to visit?
- How many days will you stay?
- What interests you most - art and museums, food, history, shopping, or a mix?
- Is this your first visit?

This will help me tailor suggestions for your trip!"

**User:** "5 days in July, first time, love art and food"

**Assistant:** "Perfect! 5 days is ideal for a first visit focusing on art and food. Here's what I suggest:

**MUST-SEE MUSEUMS** (art lover's priorities)
- Louvre (book timed entry!) - 4 hours, go early
- Musée d'Orsay - Impressionist masterpieces, 3 hours
- Rodin Museum - Beautiful sculptures + gardens, 2 hours
- Centre Pompidou - Modern art, unique architecture

**FOODIE EXPERIENCES**
- Morning: Fresh croissant at a local boulangerie
- Lunch: Le Marais district - falafel or bistros
- Evening: Latin Quarter for classic French dining
- Must-try: Macarons at Ladurée, cheese at Barthélemy

**PRACTICAL TIPS FOR JULY:**
- Weather will be warm (25-30°C) - pack light layers
- July is peak season - book restaurants ahead
- Museums close Tuesday (Louvre) or Monday (d'Orsay)
- Get Museum Pass if visiting 3+ museums

**SUGGESTED ITINERARY:**
Day 1: Louvre + Tuileries Garden + Champs-Élysées
Day 2: Montmartre + Sacré-Cœur + local food tour
Day 3: Musée d'Orsay + Saint-Germain wandering
Day 4: Versailles day trip (book ahead!)
Day 5: Le Marais + Pompidou + evening Seine cruise

Would you like specific restaurant recommendations or tips on navigating the metro?"

### Example 3: Data-Augmented Response

**User:** "What's the weather like in Tokyo right now?"

*[System fetches real-time weather data]*

**Assistant:** "According to current weather data, Tokyo is experiencing:

**Current Conditions:**
- Temperature: 15°C (59°F)
- Conditions: Partly cloudy
- Humidity: 62%
- Wind: 12 km/h

**What This Means for Travel:**
- Perfect autumn weather for sightseeing
- Light jacket recommended for evenings
- Great conditions for walking around
- No rain expected in next 24 hours

**Packing Suggestions for This Weather:**
- Light layers (sweater + light jacket)
- Comfortable walking shoes
- Sunglasses for daytime
- Small umbrella (just in case)

Are you planning a trip to Tokyo? I can suggest activities perfect for this weather!"

## 🎯 Prompt Engineering Decisions

### 1. System Prompt Design
**Decision**: Create a comprehensive system prompt with explicit role definition and constraints.

**Rationale**: 
- Sets clear expectations for response format and tone
- Explicitly instructs the LLM to avoid hallucinations
- Emphasizes the importance of external data when available
- Guides the LLM to be helpful but concise

**Implementation**: See `getSystemPrompt()` in `promptEngineer.js`

### 2. Chain-of-Thought for Complex Queries
**Decision**: Use structured multi-step reasoning for destination recommendations.

**Rationale**:
- Complex recommendations benefit from explicit reasoning steps
- Helps LLM consider multiple factors systematically
- Produces more thoughtful, well-reasoned suggestions
- Makes the LLM's logic more transparent

**Implementation**: See `getDestinationRecommendationPrompt()` - guides LLM through:
1. Analyze user preferences
2. Consider relevant factors
3. Generate options
4. Provide recommendations

### 3. Dynamic Prompt Selection
**Decision**: Automatically classify queries and use specialized prompts.

**Rationale**:
- Different query types need different approaches
- Specialized prompts extract better results than generic ones
- Query classification enables smart external data fetching
- Maintains conversation quality across diverse topics

**Implementation**: `classifyQuery()` determines type, then `buildPrompt()` assembles appropriate components

### 4. Context-Aware Follow-ups
**Decision**: Include recent conversation history in follow-up prompts.

**Rationale**:
- Maintains conversational coherence
- Allows natural multi-turn interactions
- Enables reference to previous recommendations
- Creates more helpful, personalized responses

**Implementation**: `getFollowUpPrompt()` includes last 4 message pairs for context

### 5. Data Augmentation Strategy
**Decision**: Blend external data directly into prompts rather than separate processing.

**Rationale**:
- LLM can naturally integrate real-time data with its knowledge
- Provides specific, current information
- Prompt explicitly tells LLM to prioritize real data
- Gracefully handles missing data

**Implementation**: `getDataAugmentedPrompt()` formats external data as context

### 6. Error Recovery
**Decision**: Implement validation and retry with specialized recovery prompts.

**Rationale**:
- LLMs occasionally produce poor responses
- Explicit recovery prompts improve success rate
- Maintains conversation quality even after errors
- Better than simply retrying the same prompt

**Implementation**: `validateResponse()` detects issues, `getErrorRecoveryPrompt()` guides correction

### 7. Hallucination Prevention
**Decision**: Multiple layers of protection:
- System prompt explicitly warns against making things up
- Prompts emphasize using external data when provided
- Response validation checks for common patterns
- Appropriate qualifiers in prompts ("if you don't know, say so")

**Rationale**:
- Travel advice must be reliable
- Incorrect information could harm user experience
- Multiple prevention layers more effective than single approach

## 🏗️ Architecture

```
src/
├── server.js                          # Express API server
├── services/
│   ├── travelAssistantService.js     # Main orchestration layer
│   ├── llmService.js                  # LLM provider abstraction
│   ├── externalAPIService.js          # Weather & country APIs
│   └── conversationManager.js         # Conversation state management
└── prompts/
    └── promptEngineer.js              # Prompt engineering system
```

### Design Philosophy

1. **Separation of Concerns**: Each service has a single responsibility
2. **Provider Abstraction**: Easy to swap LLM providers
3. **Testability**: Services can be tested independently
4. **Extensibility**: Easy to add new query types or data sources

## 🔧 Configuration

### LLM Provider Configuration

The system supports multiple LLM providers through a unified interface:

```javascript
// Ollama (local)
{
  provider: 'ollama',
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2'  // or 'mistral', 'llama2', etc.
}

// DeepSeek (API)
{
  provider: 'deepseek',
  deepseekApiKey: 'your-key',
  deepseekModel: 'deepseek-chat'
}
```

### Recommended Models

- **Ollama**: `llama3.2` (best balance of quality and speed)
- **DeepSeek**: `deepseek-chat` (strong reasoning capabilities)

## 🧪 Testing the API

### Using PowerShell

```powershell
# Start a conversation
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$conversationId = $response.conversationId

# Send a message
$body = @{
    message = "I want to visit Japan in spring. What should I know?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$conversationId/messages" -Method POST -Body $body -ContentType "application/json"
$response.response
```

### Using curl (Git Bash or WSL)

```bash
# Start conversation
CONV_ID=$(curl -s -X POST http://localhost:3000/api/conversations | jq -r '.conversationId')

# Send message
curl -X POST http://localhost:3000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to visit Japan in spring"}' | jq '.response'
```

### Using Postman or Insomnia

1. Import the endpoints from the API documentation above
2. Create environment variable for `conversationId`
3. Chain requests: Start Conversation → Send Messages

## 🚨 Troubleshooting

### "Ollama is not running"

**Solution**: 
```powershell
ollama serve
```

### "Model not found"

**Solution**:
```powershell
ollama pull llama3.2
```

### "Weather data not available"

**Cause**: Missing or invalid OpenWeather API key

**Solution**: 
1. Get free key from [OpenWeatherMap](https://openweathermap.org/api)
2. Add to `.env`: `OPENWEATHER_API_KEY=your_key`
3. Restart server

The system will continue working without weather data.

### "Response too slow"

**Solutions**:
- Use a smaller model (`llama3.2` is faster than `llama3`)
- Reduce `max_tokens` in `llmService.js`
- Use GPU acceleration with Ollama if available

## 📊 Performance Considerations

- **Response Time**: 2-10 seconds depending on model and query complexity
- **Memory**: ~500MB for Ollama models in RAM
- **Conversation Storage**: In-memory (use Redis for production)
- **API Rate Limits**: 
  - OpenWeather: 60 calls/minute (free tier)
  - REST Countries: No limits
  - Ollama: No limits (local)

## 🔐 Security Notes

For production deployment:
- Add authentication (JWT tokens)
- Implement rate limiting
- Use HTTPS
- Validate and sanitize all inputs
- Move to database for conversation storage
- Add monitoring and logging
- Use environment-specific configurations

## 📝 License

MIT License - feel free to use this project as a learning resource or starting point for your own travel assistant!

## 🙏 Acknowledgments

- **LLM Providers**: Ollama for excellent local LLM support, DeepSeek for accessible API
- **APIs**: OpenWeatherMap and REST Countries for free data access
- **Community**: Prompt engineering techniques inspired by various research papers and community best practices

## 📮 Support

For issues, questions, or suggestions, please open an issue on GitHub or refer to the code comments for implementation details.
