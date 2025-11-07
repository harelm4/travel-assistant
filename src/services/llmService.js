import axios from 'axios';

export class LLMService {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.ollamaBaseUrl 
    this.model = config.ollamaModel 
  }

  async generateChatResponse(messages, options = {}) {
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          num_predict: options.max_tokens || 1000,
        }
      },
      {
        timeout: 60000, 
      }
    );

    return {
      content: response.data.message.content,
      model: this.model,
      tokens: response.data.eval_count || 0,
    };
  }

  async healthCheck() {
    try {
        const response = await axios.get(`${this.baseUrl}/api/tags`);
        const models = response.data.models || [];
        const modelAvailable = models.some(m => m.name.includes(this.model));
        
        return {
          available: true,

          model: this.model,
          modelLoaded: modelAvailable,
          message: modelAvailable 
            ? `Ollama is running with ${this.model}` 
            : `Ollama is running but ${this.model} is not available. Run: ollama pull ${this.model}`
      }
    } catch (error) {
      return {
        available: false,
        error: error.message,
        model: this.model,
        message: 'Ollama is not running. Start it with: ollama serve'
      };
    }
  }
}

export default LLMService;
