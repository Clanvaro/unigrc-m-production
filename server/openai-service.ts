import OpenAI from "openai";

// OpenAI Service - using standard OpenAI API
// the newest OpenAI model is "gpt-4o-mini" which is cost-effective for most use cases
// can also use "gpt-4o" for more complex tasks

interface OpenAIConfig {
  apiKey: string;
  model: string;
}

class OpenAIService {
  private client: OpenAI | null = null;
  private config: OpenAIConfig | null = null;
  private isReady: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Don't initialize here - wait for first use
    // This allows dotenv.config() to run first
  }

  private initialize() {
    if (this.initialized) return; // Already tried to initialize
    this.initialized = true;

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey) {
      console.warn('⚠️ OpenAI credentials not configured. AI features will be disabled.');
      console.warn('Required: OPENAI_API_KEY');
      return;
    }

    try {
      this.config = { apiKey, model };

      this.client = new OpenAI({
        apiKey
      });

      this.isReady = true;
      console.log(`✅ OpenAI Service initialized with model: ${model}`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI Service:', error);
      this.isReady = false;
    }
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }

  getStatus() {
    this.ensureInitialized();
    return {
      ready: this.isReady,
      deployment: this.config?.model || null,
      provider: "openai"
    };
  }

  /**
   * Reinitialize the service (useful when API key is updated)
   */
  reinitialize() {
    console.log('🔄 Reinitializing OpenAI Service...');
    this.client = null;
    this.config = null;
    this.isReady = false;
    this.initialized = false;
    this.initialize();
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    this.ensureInitialized();
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('OpenAI Service is not initialized. Please configure OPENAI_API_KEY.');
    }

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt
        });
      }

      messages.push({
        role: "user",
        content: prompt
      });

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating text with OpenAI:', error);
      throw error;
    }
  }

  async *streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    this.ensureInitialized();
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('OpenAI Service is not initialized. Please configure OPENAI_API_KEY.');
    }

    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      if (systemPrompt) {
        messages.push({
          role: "system",
          content: systemPrompt
        });
      }

      messages.push({
        role: "user",
        content: prompt
      });

      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Error streaming text with OpenAI:', error);
      throw error;
    }
  }

  async generateCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string | AsyncGenerator<string, void, unknown>> {
    this.ensureInitialized();
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('OpenAI Service is not initialized. Please configure OPENAI_API_KEY.');
    }

    try {
      const { temperature = 0.7, maxTokens = 800, stream = false } = options || {};

      if (stream) {
        return this.streamCompletion(messages, temperature, maxTokens);
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating completion with OpenAI:', error);
      throw error;
    }
  }

  private async *streamCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client || !this.config) {
      throw new Error('OpenAI Service is not initialized.');
    }

    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      temperature,
      max_tokens: maxTokens,
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

export const openAIService = new OpenAIService();
