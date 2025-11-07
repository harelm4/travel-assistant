# Travel Assistant - Setup Guide

Step-by-step guide to get the Travel Assistant API running on your machine.

## Prerequisites

### Required
- **Node.js 18+** - [Download here](https://nodejs.org/)
  - Check version: `node --version`
  - Should show v18.0.0 or higher

### LLM Provider (choose one)
- **Option A: Ollama** (Recommended for local development)
  - Free, runs locally
  - No API key needed
  - [Download from ollama.ai](https://ollama.ai)
  
- **Option B: DeepSeek**
  - Free tier available
  - Requires API key
  - [Sign up at DeepSeek](https://platform.deepseek.com/)

### Optional
- **OpenWeather API Key** (for weather data)
  - Free tier: 60 calls/minute
  - [Get key here](https://openweathermap.org/api)

## Installation Steps

### Step 1: Clone or Download the Project

If you have the project as a zip:
```powershell
# Extract to a folder of your choice
# Navigate to the folder
cd path\to\travel-assistant
```

### Step 2: Install Dependencies

```powershell
npm install
```

This installs:
- express (web framework)
- axios (HTTP client)
- dotenv (environment variables)
- uuid (unique IDs)

### Step 3: Choose and Set Up Your LLM Provider

#### Option A: Ollama (Local - Recommended)

1. **Install Ollama**
   - Download from [ollama.ai](https://ollama.ai)
   - Run the installer
   - Ollama will start automatically

2. **Pull a Model**
   ```powershell
   ollama pull llama3.2
   ```
   
   This downloads the Llama 3.2 model (~2GB). Wait for it to complete.
   
   **Alternative Models:**
   - `ollama pull llama3.2:1b` (smaller, faster, less capable)
   - `ollama pull mistral` (good alternative)
   - `ollama pull llama2` (older but stable)

3. **Verify Ollama is Running**
   ```powershell
   ollama list
   ```
   
   You should see llama3.2 in the list.

4. **Test the Model**
   ```powershell
   ollama run llama3.2 "Say hello"
   ```
   
   If you get a response, Ollama is working!

#### Option B: DeepSeek (API)

1. **Get API Key**
   - Go to [DeepSeek Platform](https://platform.deepseek.com/)
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key
   - Save it securely

2. **Note Your API Key**
   - You'll need this for the `.env` file

### Step 4: Configure Environment Variables

1. **Copy the example file**
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edit `.env` file**
   
   Open `.env` in your favorite text editor.
   
   **For Ollama (Local):**
   ```env
   PORT=3000
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.2
   ```
   
   **For DeepSeek (API):**
   ```env
   PORT=3000
   LLM_PROVIDER=deepseek
   DEEPSEEK_API_KEY=your_actual_api_key_here
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   DEEPSEEK_MODEL=deepseek-chat
   ```
   
   **Optional - Add Weather API:**
   ```env
   OPENWEATHER_API_KEY=your_key_here
   ```

### Step 5: Start the Server

```powershell
npm start
```

You should see:
```
🚀 Travel Assistant API is running!
📍 Server: http://localhost:3000
🤖 LLM Provider: ollama

📚 API Endpoints:
   GET  / - API information
   GET  /api/health - Health check
   POST /api/conversations - Start new conversation
   ...
```

### Step 6: Test the API

**Option 1: Use the test script**
```powershell
.\test-api.ps1
```

**Option 2: Manual test**
```powershell
# Check health
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET

# Start conversation
$conv = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations" -Method POST
$id = $conv.conversationId

# Send message
$body = @{ message = "I want to visit Japan" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversations/$id/messages" -Method POST -Body $body -ContentType "application/json"
Write-Host $response.response
```

## Troubleshooting

### "Ollama is not running"

**Problem**: Server says Ollama is not available

**Solutions**:
1. Check if Ollama is running:
   ```powershell
   ollama list
   ```
   
2. If not running, start it:
   ```powershell
   ollama serve
   ```
   
3. Verify port 11434 is accessible:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 11434
   ```

### "Model not found"

**Problem**: Ollama is running but model isn't available

**Solution**:
```powershell
ollama pull llama3.2
```

Wait for download to complete, then restart the server.

### "Module not found" errors

**Problem**: npm packages not installed

**Solution**:
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

### Port 3000 already in use

**Problem**: Another application is using port 3000

**Solutions**:

1. **Change port in `.env`:**
   ```env
   PORT=3001
   ```

2. **Find and stop the process:**
   ```powershell
   # Find process using port 3000
   Get-NetTCPConnection -LocalPort 3000
   
   # Stop it (replace PID with actual process ID)
   Stop-Process -Id <PID>
   ```

### "Weather data not available"

**Problem**: Weather API not configured or invalid key

**Solution**:
1. This is optional - the API works without it
2. Get free key from [OpenWeatherMap](https://openweathermap.org/api)
3. Add to `.env`: `OPENWEATHER_API_KEY=your_key`
4. Restart server

### Slow responses

**Problem**: Responses take 10+ seconds

**Reasons & Solutions**:

1. **Large model**: Use smaller model
   ```powershell
   ollama pull llama3.2:1b
   ```
   Update `.env`: `OLLAMA_MODEL=llama3.2:1b`

2. **No GPU**: Ollama uses CPU by default
   - This is normal
   - Consider GPU-enabled setup for faster responses
   - Or use DeepSeek API instead

3. **First request**: First response is always slower
   - Ollama loads model into memory
   - Subsequent requests will be faster

### "Cannot connect to DeepSeek"

**Problem**: DeepSeek API not accessible

**Solutions**:

1. **Check API key**: Verify it's correct in `.env`

2. **Check internet connection**: DeepSeek requires internet

3. **Check API status**: Visit [DeepSeek status page](https://platform.deepseek.com/)

4. **Try Ollama instead**: Switch to local setup

## Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install` completed)
- [ ] LLM provider set up (Ollama or DeepSeek)
- [ ] `.env` file configured
- [ ] Server starts without errors
- [ ] Health check returns "healthy" status
- [ ] Can create a conversation
- [ ] Can send and receive messages

## Next Steps

Once everything is working:

1. **Read the documentation**:
   - `README.md` - Full documentation
   - `API_EXAMPLES.md` - Usage examples
   - `SAMPLE_CONVERSATIONS.md` - Conversation examples
   - `PROMPT_ENGINEERING_NOTES.md` - Design decisions

2. **Try the test script**:
   ```powershell
   .\test-api.ps1
   ```

3. **Experiment with different queries**:
   - Destination recommendations
   - Packing advice
   - Local attractions
   - Food recommendations
   - Budget planning

4. **Explore the code**:
   - `src/prompts/promptEngineer.js` - Prompt engineering
   - `src/services/travelAssistantService.js` - Main logic
   - `src/server.js` - API endpoints

## Development Mode

For active development with auto-reload:

```powershell
npm run dev
```

This uses Node.js `--watch` flag to restart on file changes.

## Getting Help

If you encounter issues not covered here:

1. Check server console logs for detailed error messages
2. Review the `PROMPT_ENGINEERING_NOTES.md` for design context
3. Look at `API_EXAMPLES.md` for usage patterns
4. Check GitHub issues (if applicable)

## Performance Tips

1. **Use smaller models** for faster responses:
   - `llama3.2:1b` instead of `llama3.2`

2. **Limit conversation history**:
   - Default is 20 messages
   - Adjust in `conversationManager.js`

3. **Use DeepSeek API** if local performance is poor:
   - Faster than CPU-based Ollama
   - Requires internet and API key

4. **Consider GPU setup** for Ollama:
   - Significantly faster
   - Requires compatible GPU (NVIDIA, AMD, or Apple Silicon)

## Production Considerations

This is a development/demonstration setup. For production:

1. **Add authentication** (JWT tokens)
2. **Use database** for conversation storage (currently in-memory)
3. **Add rate limiting**
4. **Enable HTTPS**
5. **Add monitoring** and logging
6. **Use environment-specific configs**
7. **Add input validation** and sanitization
8. **Set up CI/CD pipeline**

## System Requirements

### Minimum
- **CPU**: 4 cores
- **RAM**: 8GB (for Ollama models)
- **Disk**: 5GB free space
- **OS**: Windows 10+, macOS, or Linux

### Recommended
- **CPU**: 8+ cores
- **RAM**: 16GB
- **GPU**: Optional but significantly faster
- **SSD**: For faster model loading

## FAQ

**Q: Can I use other LLM providers?**
A: Yes! The `llmService.js` is designed to be extensible. Add your provider by implementing the same interface.

**Q: Can I use multiple models?**
A: Yes! Pull multiple models with Ollama and switch by changing `OLLAMA_MODEL` in `.env`.

**Q: Does this work offline?**
A: Yes with Ollama (once model is downloaded). DeepSeek requires internet.

**Q: Can I customize the prompts?**
A: Absolutely! Edit `src/prompts/promptEngineer.js` to modify prompts.

**Q: How much does it cost?**
A: Ollama is free. DeepSeek has a free tier. OpenWeather has a free tier (60 calls/min).

**Q: Can I deploy this?**
A: Yes! Deploy to any Node.js hosting (Heroku, Railway, AWS, etc.). See Production Considerations above.

## Success!

If you've made it here and everything is working, congratulations! You now have a working AI-powered travel assistant. 

Try asking it complex questions, follow up with more details, and see how it maintains context across the conversation. Experiment with different query types and observe the prompt engineering in action.

Enjoy exploring! 🌍✈️
