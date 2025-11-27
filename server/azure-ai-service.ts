import { AzureOpenAI } from "openai";

interface AzureAIConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

class AzureAIService {
  private client: AzureOpenAI | null = null;
  private config: AzureAIConfig | null = null;
  private isReady: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !deployment) {
      console.warn('⚠️ Azure OpenAI credentials not configured. AI features will be disabled.');
      console.warn('Required: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT');
      return;
    }

    try {
      this.config = { endpoint, apiKey, deployment };
      
      // Initialize Azure OpenAI client with official Azure SDK configuration
      this.client = new AzureOpenAI({
        apiKey,
        endpoint,
        apiVersion: "2024-08-01-preview"
      });

      this.isReady = true;
      console.log(`✅ Azure OpenAI Service initialized with deployment: ${deployment}`);
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI Service:', error);
      this.isReady = false;
    }
  }

  getStatus() {
    return {
      ready: this.isReady,
      deployment: this.config?.deployment || null,
      endpoint: this.config?.endpoint || null
    };
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('Azure OpenAI Service is not initialized. Please configure API credentials.');
    }

    try {
      const messages: any[] = [];
      
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
        model: this.config.deployment,
        messages,
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating text with Azure OpenAI:', error);
      throw error;
    }
  }

  async *streamText(prompt: string, systemPrompt?: string): AsyncGenerator<string, void, unknown> {
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('Azure OpenAI Service is not initialized. Please configure API credentials.');
    }

    try {
      const messages: any[] = [];
      
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
        model: this.config.deployment,
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
      console.error('Error streaming text with Azure OpenAI:', error);
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
    if (!this.isReady || !this.client || !this.config) {
      throw new Error('Azure OpenAI Service is not initialized. Please configure API credentials.');
    }

    try {
      const { temperature = 0.7, maxTokens = 800, stream = false } = options || {};

      if (stream) {
        return this.streamCompletion(messages, temperature, maxTokens);
      }

      const response = await this.client.chat.completions.create({
        model: this.config.deployment,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Error generating completion with Azure OpenAI:', error);
      throw error;
    }
  }

  private async *streamCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client || !this.config) {
      throw new Error('Azure OpenAI Service is not initialized.');
    }

    const stream = await this.client.chat.completions.create({
      model: this.config.deployment,
      messages,
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

export const azureAIService = new AzureAIService();
