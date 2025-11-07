# API Usage Examples

This document provides practical examples of using the Travel Assistant API.

## Setup

Make sure the server is running:
```powershell
npm start
```

## Example 1: Basic Conversation Flow

### Step 1: Start a Conversation

**Request:**
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$conversationId = $response.conversationId
```

**Response:**
```json
{
  "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "message": "New conversation started"
}
```

### Step 2: Send a Message

**Request:**
```powershell
$body = @{
    message = "I want to visit Japan in spring. What should I know?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$conversationId/messages" -Method POST -Body $body -ContentType "application/json"
```

**Response:**
```json
{
  "response": "Spring is an excellent time to visit Japan! Here's what you should know...\n\n[Assistant's detailed response]",
  "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "queryType": "destination_recommendation",
  "externalDataUsed": ["country", "weather"],
  "timestamp": "2025-11-07T10:30:00.000Z"
}
```

### Step 3: Follow-up Question

**Request:**
```powershell
$body = @{
    message = "What should I pack for this trip?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$conversationId/messages" -Method POST -Body $body -ContentType "application/json"
```

The assistant will remember you're going to Japan in spring and provide relevant packing advice.

### Step 4: View Conversation History

**Request:**
```powershell
$history = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$conversationId" -Method GET
```

**Response:**
```json
{
  "conversationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "messages": [
    {
      "role": "user",
      "content": "I want to visit Japan in spring. What should I know?",
      "timestamp": "2025-11-07T10:30:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Spring is an excellent time to visit Japan!...",
      "timestamp": "2025-11-07T10:30:05.000Z",
      "queryType": "destination_recommendation",
      "externalDataUsed": true
    }
  ],
  "context": {
    "userPreferences": {},
    "extractedInfo": {
      "destinations": ["Japan"],
      "interests": []
    }
  },
  "createdAt": "2025-11-07T10:29:55.000Z",
  "lastActivity": "2025-11-07T10:30:05.000Z"
}
```

## Example 2: Weather-Based Query

```powershell
# Start conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Ask about weather
$body = @{
    message = "What's the weather like in Paris right now?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"
Write-Host $response.response
```

**Expected Response:**
The assistant will fetch real-time weather data and provide current conditions with travel recommendations.

## Example 3: Packing Advice

```powershell
# Start conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Ask for packing advice
$body = @{
    message = "I'm going to Iceland in December for a week. What should I pack?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"
Write-Host $response.response
```

**Expected Response:**
Comprehensive packing list with categories (clothing, essentials, Iceland-specific items).

## Example 4: Budget Travel

```powershell
# Start conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Ask about budget destinations
$body = @{
    message = "I have $2000 for a 2-week vacation. Where can I go from New York?"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"
Write-Host $response.response
```

## Example 5: Multi-Turn Planning Conversation

```powershell
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Turn 1: Initial interest
$body1 = @{ message = "I want to visit Southeast Asia" } | ConvertTo-Json
$r1 = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body1 -ContentType "application/json"

# Turn 2: Add preferences
$body2 = @{ message = "I have 3 weeks and love beaches and food" } | ConvertTo-Json
$r2 = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body2 -ContentType "application/json"

# Turn 3: Specific destination
$body3 = @{ message = "Tell me more about Thailand" } | ConvertTo-Json
$r3 = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body3 -ContentType "application/json"

# Turn 4: Practical details
$body4 = @{ message = "What's the best area to stay in Bangkok?" } | ConvertTo-Json
$r4 = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body4 -ContentType "application/json"

# View complete conversation
$history = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id" -Method GET
$history.messages | ForEach-Object {
    Write-Host "`n[$($_.role)]" -ForegroundColor $(if($_.role -eq 'user'){'Yellow'}else{'Green'})
    Write-Host $_.content.Substring(0, [Math]::Min(200, $_.content.Length)) + "..."
}
```

## Example 6: Error Handling

```powershell
# Try to send message to non-existent conversation
try {
    $body = @{ message = "Hello" } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/invalid-id/messages" -Method POST -Body $body -ContentType "application/json"
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "Error: $($errorDetails.error)" -ForegroundColor Red
    Write-Host "Message: $($errorDetails.message)" -ForegroundColor Yellow
}
```

**Expected Output:**
```
Error: Conversation not found
Message: Please start a new conversation first
```

## Example 7: Reset Conversation

```powershell
# Create and use a conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Send some messages
$body = @{ message = "I want to visit Italy" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"

# Reset the conversation (keeps same ID, clears history)
$reset = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/reset" -Method POST -ContentType "application/json"
Write-Host "Conversation reset: $($reset.message)"

# New messages start fresh
$body2 = @{ message = "I want to visit Japan" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body2 -ContentType "application/json"
```

## Example 8: Delete Conversation

```powershell
# Create a conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST -ContentType "application/json"
$id = $conv.conversationId

# Delete it
$delete = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id" -Method DELETE
Write-Host "Deleted: $($delete.message)"

# Try to access it (will fail)
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id" -Method GET
} catch {
    Write-Host "Conversation no longer exists" -ForegroundColor Yellow
}
```

## Example 9: Health Check

```powershell
$health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

Write-Host "API Status: $($health.status)"
Write-Host "LLM Provider: $($health.llm.provider)"
Write-Host "LLM Available: $($health.llm.available)"
Write-Host "Total Conversations: $($health.conversations.totalConversations)"
Write-Host "Active Conversations: $($health.conversations.activeConversations)"
```

## Example 10: Complete Test Script

```powershell
# Complete workflow test
function Test-TravelAssistant {
    param(
        [string]$BaseUrl = "http://localhost:3000"
    )
    
    Write-Host "`n=== Testing Travel Assistant API ===" -ForegroundColor Cyan
    
    # 1. Health check
    Write-Host "`n1. Health Check..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET
    if ($health.status -eq "healthy") {
        Write-Host "   ✓ API is healthy" -ForegroundColor Green
    } else {
        Write-Host "   ✗ API is not healthy" -ForegroundColor Red
        return
    }
    
    # 2. Create conversation
    Write-Host "`n2. Creating conversation..." -ForegroundColor Yellow
    $conv = Invoke-RestMethod -Uri "$BaseUrl/api/conversations" -Method POST -ContentType "application/json"
    $id = $conv.conversationId
    Write-Host "   ✓ Created: $id" -ForegroundColor Green
    
    # 3. Test different query types
    $queries = @(
        @{ message = "I want to visit Italy for 2 weeks"; type = "destination" },
        @{ message = "What should I pack?"; type = "packing" },
        @{ message = "What are the best food experiences in Rome?"; type = "food" }
    )
    
    foreach ($q in $queries) {
        Write-Host "`n3. Testing $($q.type) query..." -ForegroundColor Yellow
        $body = @{ message = $q.message } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$BaseUrl/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"
        Write-Host "   ✓ Query Type: $($response.queryType)" -ForegroundColor Green
        Write-Host "   Response length: $($response.response.Length) chars" -ForegroundColor Gray
    }
    
    # 4. Get history
    Write-Host "`n4. Retrieving history..." -ForegroundColor Yellow
    $history = Invoke-RestMethod -Uri "$BaseUrl/api/conversations/$id" -Method GET
    Write-Host "   ✓ Messages: $($history.messages.Count)" -ForegroundColor Green
    
    # 5. Cleanup
    Write-Host "`n5. Cleaning up..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$BaseUrl/api/conversations/$id" -Method DELETE | Out-Null
    Write-Host "   ✓ Conversation deleted" -ForegroundColor Green
    
    Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Cyan
}

# Run the test
Test-TravelAssistant
```

## Using with Other Tools

### cURL (Git Bash or WSL)

```bash
# Start conversation
CONV_ID=$(curl -s -X POST http://localhost:3000/api/conversations | jq -r '.conversationId')
echo "Conversation ID: $CONV_ID"

# Send message
curl -X POST http://localhost:3000/api/conversations/$CONV_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to visit Japan"}' \
  | jq '.response'

# Get history
curl -s http://localhost:3000/api/conversations/$CONV_ID | jq '.messages'
```

### Postman Collection

1. Create a new collection "Travel Assistant"
2. Add environment variable: `conversationId`
3. Add requests:
   - POST `/api/conversations` → Save response.conversationId to environment
   - POST `/api/conversations/{{conversationId}}/messages` with JSON body
   - GET `/api/conversations/{{conversationId}}`

### Python Script

```python
import requests
import json

BASE_URL = "http://localhost:3000"

# Start conversation
response = requests.post(f"{BASE_URL}/api/conversations")
conversation_id = response.json()["conversationId"]
print(f"Conversation ID: {conversation_id}")

# Send message
message = {"message": "I want to visit Japan in spring"}
response = requests.post(
    f"{BASE_URL}/api/conversations/{conversation_id}/messages",
    json=message
)
print(response.json()["response"])

# Get history
history = requests.get(f"{BASE_URL}/api/conversations/{conversation_id}")
print(f"Total messages: {len(history.json()['messages'])}")
```

## Tips for Testing

1. **Use the test script**: Run `.\test-api.ps1` for quick testing
2. **Check health first**: Always verify the API is running with `/api/health`
3. **Save conversation IDs**: Store them in variables for multi-turn testing
4. **Test edge cases**: Empty messages, very long messages, non-existent IDs
5. **Monitor console**: Server logs show detailed information about processing
6. **Test different query types**: Destination, packing, attractions, food, budget
7. **Try follow-ups**: Test context retention across multiple messages

## Troubleshooting

**Error: "Conversation not found"**
- Make sure you're using the correct conversation ID
- Check if the conversation was deleted
- Create a new conversation if needed

**Error: "Failed to generate response"**
- Check if Ollama is running: `ollama list`
- Verify model is available: `ollama pull llama3.2`
- Check server logs for detailed error message

**Slow responses**
- This is normal for larger models
- Consider using a smaller model
- Check CPU usage (Ollama is CPU-intensive without GPU)

**No external data in responses**
- Weather API key may be missing or invalid
- Check `.env` file configuration
- API will work without external data, just with less specific information
