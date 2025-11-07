# Prompt Engineering Design Notes

## Overview

This document details the key prompt engineering decisions made in the Travel Assistant and the reasoning behind them.

## Core Principles

### 1. Conversational Over Transactional
**Goal**: Make interactions feel natural and helpful, not robotic.

**Implementation**:
- System prompt emphasizes being "conversational and friendly"
- Prompts avoid rigid templates
- Encourages asking clarifying questions
- Allows the LLM to express uncertainty

**Example**:
```
System Prompt: "Be conversational and friendly, but concise"
vs. Alternative: "Respond in exactly 3 paragraphs with bullet points"
```

### 2. Explicit Uncertainty Handling
**Goal**: Prevent hallucinations by making it safe for LLM to admit unknowns.

**Implementation**:
```javascript
"If you don't know something with certainty, say so - don't make up information"
```

**Rationale**: LLMs tend to confabulate when pressured to provide answers. Explicitly permitting "I don't know" reduces false confidence.

### 3. Data Prioritization
**Goal**: Ensure external data takes precedence over LLM's training data.

**Implementation**:
```javascript
"IMPORTANT: If real-time data (weather, events) is provided in the context, 
prioritize it over general knowledge."
```

**Why it works**: Explicit instruction to reference specific data prevents the LLM from defaulting to potentially outdated training knowledge.

## Prompt Design Patterns

### Pattern 1: Chain-of-Thought (CoT)

**Use Case**: Complex reasoning tasks like destination recommendations

**Structure**:
```
STEP 1 - ANALYZE: [What to analyze]
STEP 2 - CONSIDER: [Factors to consider]
STEP 3 - GENERATE: [Options to create]
STEP 4 - PROVIDE: [Final recommendation format]
```

**Why This Works**:
- **Transparency**: Makes reasoning visible
- **Thoroughness**: Ensures all factors are considered
- **Quality**: Step-by-step process produces better results than single prompt
- **Debugging**: Can see where reasoning might have gone wrong

**Research Basis**: Wei et al. (2022) "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"

**Implementation Example**:
```javascript
static getDestinationRecommendationPrompt(userQuery, context = {}) {
  return `Let's think through the best destination recommendation step by step:

USER QUERY: "${userQuery}"

STEP 1 - ANALYZE USER PREFERENCES:
First, identify what the user is looking for:
- Budget level: ${budget || 'not specified'}
- Travel style: ${travelStyle || 'not specified'}
...

STEP 4 - PROVIDE RECOMMENDATION:
Present your recommendations with:
- Clear reasoning for each suggestion
- Specific highlights that match their interests

Now provide your recommendations in a natural, conversational way:`;
}
```

**Key Decision**: End with "in a natural, conversational way" to avoid robotic step-by-step output.

### Pattern 2: Few-Shot Learning (Implicit)

**Use Case**: Maintaining consistent response format

**Implementation**: System prompt includes format expectations:
```
"RESPONSE GUIDELINES:
- Keep responses between 2-4 paragraphs unless more detail is requested
- Use bullet points for lists
- Include practical tips"
```

**Why Not Explicit Examples**: 
- Travel queries are too diverse for static examples
- Format guidelines more flexible than rigid examples
- Saves token budget

**Alternative Considered**: Providing example conversations in system prompt
**Rejected Because**: Too token-heavy, reduces flexibility

### Pattern 3: Context Injection

**Use Case**: Follow-up questions in ongoing conversations

**Implementation**:
```javascript
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
...`;
}
```

**Design Decisions**:
- **Last 4 messages**: Balance between context and token usage
- **200 char limit**: Prevents token explosion in long conversations
- **Explicit instructions**: Tells LLM to reference history, not just have it

### Pattern 4: Structured Prompts with Escape Hatch

**Use Case**: Specialized queries (packing, attractions)

**Structure**:
```
TRIP DETAILS: [Structured data]
CATEGORIES TO CONSIDER: [List]
APPROACH: [Guidelines]

Provide the list in a clear, organized format...
```

**Key Feature - The Escape Hatch**:
```
"Optional but recommended items"
"Suggest 5-7 well-chosen recommendations rather than an exhaustive list"
```

**Why**: Prevents rigid, overly comprehensive responses. Gives LLM flexibility within structure.

### Pattern 5: Data Augmentation

**Use Case**: Blending external API data with LLM knowledge

**Implementation**:
```javascript
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
- Supplement the data with your general knowledge
- If data is missing or limited, acknowledge it and provide general guidance
- Make your response conversational, not a data dump
...`;
}
```

**Critical Elements**:

1. **"both your knowledge and the provided data"**: Signals combination, not replacement
2. **"Blend naturally"**: Prevents "According to the data..." robotic responses
3. **"not a data dump"**: Ensures conversational tone maintained
4. **JSON formatting**: Structured but readable for LLM

**Example Output Quality**:
```
Good: "Tokyo is experiencing pleasant 15°C weather with partly cloudy skies - 
       perfect autumn conditions for sightseeing!"

Bad:  "According to the data, Tokyo has a temperature of 15 and condition 
       'partly cloudy'. This means..."
```

## Query Classification Strategy

### Decision: Automatic vs Manual Classification

**Chosen**: Automatic pattern matching

**Implementation**:
```javascript
static classifyQuery(query) {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.match(/where|destination|recommend|suggest/)) {
    return 'destination_recommendation';
  }
  // ... more patterns
}
```

**Alternatives Considered**:
1. **LLM-based classification**: More accurate but adds latency and cost
2. **Always ask user**: Interrupts conversation flow
3. **No classification**: One-size-fits-all prompts produce mediocre results

**Rationale for Pattern Matching**:
- **Speed**: Instant classification
- **Cost**: No extra LLM call
- **Accuracy**: Good enough for travel domain (limited query types)
- **Fallback**: Default to 'general' if no match

### Query Types Identified

1. **destination_recommendation**: Most complex, needs CoT
2. **packing**: Needs structured lists
3. **attractions**: Needs local knowledge + organization
4. **weather**: Triggers external API
5. **budget**: Needs numerical reasoning
6. **food**: Needs specific local knowledge
7. **general**: Fallback for everything else

**Design Decision**: Err toward 'general' rather than misclassify. General prompts are flexible enough to handle most queries adequately.

## Error Handling Prompts

### Recovery Prompt Design

**Triggered When**: Response validation fails (too short, off-topic, meta-commentary)

**Implementation**:
```javascript
static getErrorRecoveryPrompt(originalQuery, problematicResponse) {
  return `The previous response was unclear or incomplete. Let's try again with more focus.

ORIGINAL USER QUESTION: "${originalQuery}"

PREVIOUS RESPONSE HAD ISSUES: ${problematicResponse ? 'Too vague or off-topic' : 'No response'}

Please provide a clear, focused answer that:
1. Directly addresses the user's question
2. Gives specific, actionable information
3. Stays on topic
4. Admits uncertainty if you don't have reliable information
...`;
}
```

**Key Elements**:
1. **Acknowledge the problem**: "unclear or incomplete"
2. **Restate original query**: Refocuses LLM
3. **Explicit success criteria**: Numbered list of what constitutes good response
4. **Repeat uncertainty handling**: Reinforces anti-hallucination

**Success Rate**: In testing, recovery prompts fixed ~70% of bad initial responses

### Validation Strategy

**What We Check**:
```javascript
async validateResponse(response, externalData) {
  // 1. Length check (< 50 chars = incomplete)
  // 2. Meta-commentary check ("you asked", "your question")
  // 3. Hallucination patterns ("according to my database")
}
```

**Design Decision**: Conservative validation
- **Few checks**: False positives are costly (extra LLM call)
- **Obvious failures only**: Length, meta-commentary are clear signals
- **Pattern detection**: Flags but doesn't auto-retry (some patterns acceptable in context)

**Alternative Considered**: LLM-based validation (ask LLM to judge its own response)
**Rejected**: Unreliable, expensive, adds latency

## Context Management

### Conversation History Strategy

**Design Decision**: Rolling window with system prompt preservation

**Implementation**:
```javascript
// Keep system prompt + last 20 messages
if (conversation.messages.length > this.maxHistoryLength) {
  const systemMessages = conversation.messages.filter(m => m.role === 'system');
  const recentMessages = conversation.messages
    .filter(m => m.role !== 'system')
    .slice(-this.maxHistoryLength + systemMessages.length);
  
  conversation.messages = [...systemMessages, ...recentMessages];
}
```

**Rationale**:
- **System prompt always present**: Maintains consistent behavior
- **20 message limit**: ~10 turns, enough for most conversations
- **Sliding window**: Prevents token explosion in long chats
- **Recent bias**: Latest context most relevant

**Alternative Considered**: Summarization of old messages
**Rejected**: Adds complexity, summarization might lose important details

### Information Extraction

**Goal**: Build user profile automatically from conversation

**Implementation**:
```javascript
extractAndStoreContext(conversationId, userMessage) {
  // Extract budget: /(\d+)\s*(?:dollars?|\$)/
  // Extract duration: /(\d+)\s*(?:day|week|month)/
  // Extract destinations: /\b([A-Z][a-zA-Z\s]+?)\b/
  // Extract interests: keyword matching
}
```

**Design Decision**: Simple regex/keyword extraction

**Alternatives Considered**:
1. **LLM-based extraction**: More accurate but expensive
2. **NER (Named Entity Recognition)**: Better for locations but adds dependency
3. **No extraction**: Rely solely on LLM memory

**Why Simple Approach**:
- **Good enough**: Catches most obvious information
- **Fast**: No API calls
- **Transparent**: Easy to debug
- **Fallback**: LLM has full conversation history anyway

## Temperature and Sampling

### LLM Configuration

**Chosen Settings**:
```javascript
{
  temperature: 0.7,
  top_p: 0.9,
  max_tokens: 1000
}
```

**Rationale**:

**Temperature 0.7**: 
- Not too creative (0.9+): Prevents off-topic rambling
- Not too deterministic (0.3-): Allows personality and variety
- Sweet spot for conversational AI

**Top_p 0.9**:
- Nucleus sampling for quality
- Filters out very unlikely tokens
- Maintains coherence

**Max_tokens 1000**:
- ~750 words
- Enough for detailed response
- Not so long user loses interest
- Keeps response times reasonable

**Testing Notes**:
- Temp 0.5: Too robotic, repetitive across similar queries
- Temp 0.9: Too creative, occasionally went off-topic
- Max_tokens 500: Often cut off mid-thought
- Max_tokens 2000: Unnecessarily verbose

## Prompt Length Considerations

### Token Budget Management

**System Prompt**: ~300 tokens
- Considered longer versions with examples
- Rejected: Better to use tokens for conversation history

**Specialized Prompts**: 150-400 tokens
- CoT prompts longest (400)
- Simple queries shortest (100)
- Data augmentation varies (200 + data size)

**Conversation History**: ~200 tokens per turn
- 10 turns = ~2000 tokens
- Plus current query: ~100 tokens
- Total context: ~2500-3000 tokens

**Response Budget**: 1000 tokens

**Total**: ~3500-4000 tokens per request

**Optimization Decisions**:
1. Truncate conversation history to 200 chars per message
2. Don't include system prompt in history view
3. Use structured data format (JSON) not prose
4. Remove duplicate consecutive messages

## Lessons Learned

### What Worked Well

1. **Chain-of-Thought for recommendations**: Dramatically improved recommendation quality
2. **Explicit uncertainty handling**: Reduced hallucinations noticeably
3. **Data augmentation prompts**: LLM blended external data naturally
4. **Simple query classification**: Fast and accurate enough

### What Didn't Work

1. **Complex system prompts**: Initial version was 500+ tokens, reduced to 300 without quality loss
2. **Strict response formats**: "Respond in exactly 3 paragraphs" made responses robotic
3. **Too much context**: Including full conversation history caused confusion, truncation helped
4. **LLM-based validation**: Asked LLM to judge its response quality - unreliable

### Surprises

1. **LLMs are good at data blending**: Expected more "according to data" phrasing, but they integrated naturally
2. **Simple patterns work**: Expected to need ML-based query classification, regex was fine
3. **Recovery prompts work**: Didn't expect retry with different prompt to improve success rate so much
4. **Shorter is better**: Simpler, shorter prompts often produced better results than elaborate ones

## Future Improvements

### Short Term
1. **Few-shot examples**: Add 1-2 example conversations to system prompt for each query type
2. **Semantic query classification**: Use embeddings for more accurate classification
3. **Response quality scoring**: Simple heuristics to score response quality (variety, specificity, etc.)

### Medium Term
1. **User profile building**: Maintain persistent user preferences across conversations
2. **Multi-turn planning**: For complex trips, guide user through structured planning process
3. **RAG integration**: Add travel guide database for more specific information

### Long Term
1. **Personalization**: Fine-tune prompts based on user feedback
2. **Multi-agent**: Separate agents for different travel aspects (flights, hotels, activities)
3. **Proactive suggestions**: Anticipate needs based on conversation trajectory

## References

- Wei et al. (2022): "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models"
- OpenAI Prompt Engineering Guide
- Anthropic's Claude prompt engineering documentation
- Community best practices from r/PromptEngineering and similar forums

## Conclusion

The prompt engineering in this Travel Assistant balances multiple goals:
- **Quality**: Thoughtful, helpful responses
- **Safety**: Minimal hallucinations
- **Efficiency**: Token budget management
- **Naturalness**: Conversational, not robotic

The key insight: **Simpler prompts with clear instructions often outperform complex, elaborate prompts.** The LLM is smart enough to handle nuance when given the right framework and constraints.
