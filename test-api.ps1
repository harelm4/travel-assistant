# Quick Start Testing Script
# This script helps you quickly test the Travel Assistant API

Write-Host "=== Travel Assistant API - Quick Test ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Check if server is running
Write-Host "1. Checking if server is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -ErrorAction Stop
    Write-Host "   ✓ Server is running!" -ForegroundColor Green
    Write-Host "   LLM Provider: $($health.llm.provider)" -ForegroundColor Gray
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Server is not running!" -ForegroundColor Red
    Write-Host "   Please start the server with: npm start" -ForegroundColor Yellow
    exit
}

# Start a new conversation
Write-Host "2. Starting a new conversation..." -ForegroundColor Yellow
try {
    $conversation = Invoke-RestMethod -Uri "$baseUrl/api/conversations" -Method POST -ContentType "application/json"
    $conversationId = $conversation.conversationId
    Write-Host "   ✓ Conversation started!" -ForegroundColor Green
    Write-Host "   Conversation ID: $conversationId" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Failed to start conversation!" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit
}

# Test conversation with sample queries
$queries = @(
    "I want to visit Japan in spring. What should I know?",
    "What should I pack?",
    "What are the must-see attractions in Tokyo?"
)

foreach ($query in $queries) {
    Write-Host "3. Sending message: '$query'" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $body = @{
            message = $query
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/api/conversations/$conversationId/messages" -Method POST -Body $body -ContentType "application/json"
        
        Write-Host "   Assistant Response:" -ForegroundColor Green
        Write-Host "   --------------------------------------------------" -ForegroundColor Gray
        Write-Host "   $($response.response)" -ForegroundColor White
        Write-Host "   --------------------------------------------------" -ForegroundColor Gray
        Write-Host "   Query Type: $($response.queryType)" -ForegroundColor Gray
        Write-Host "   External Data Used: $($response.externalDataUsed -join ', ')" -ForegroundColor Gray
        Write-Host ""
        
        # Wait a bit between queries
        Start-Sleep -Seconds 2
        
    } catch {
        Write-Host "   ✗ Failed to send message!" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

# Get conversation history
Write-Host "4. Retrieving conversation history..." -ForegroundColor Yellow
try {
    $history = Invoke-RestMethod -Uri "$baseUrl/api/conversations/$conversationId" -Method GET
    Write-Host "   ✓ History retrieved!" -ForegroundColor Green
    Write-Host "   Total messages: $($history.messages.Count)" -ForegroundColor Gray
    Write-Host "   Created at: $($history.createdAt)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ✗ Failed to retrieve history!" -ForegroundColor Red
}

Write-Host "=== Test Complete! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can continue this conversation by sending more messages to:" -ForegroundColor White
Write-Host "POST $baseUrl/api/conversations/$conversationId/messages" -ForegroundColor Gray
Write-Host ""
Write-Host "Or view the full history at:" -ForegroundColor White
Write-Host "GET $baseUrl/api/conversations/$conversationId" -ForegroundColor Gray
Write-Host ""
