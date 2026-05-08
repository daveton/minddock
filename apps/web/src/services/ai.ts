// AI Service for Inline AI functionality

export interface AIRequest {
  action: 'summarize' | 'expand' | 'translate' | 'generate_summary';
  text: string;
  context?: string;
  language?: string;
}

export interface AIResponse {
  success: boolean;
  data?: string;
  error?: string;
}

class AIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_AI_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_AI_BASE_URL || 'https://api.openai.com/v1';
    this.model = import.meta.env.VITE_AI_MODEL || 'gpt-3.5-turbo';

    if (!this.apiKey) {
      console.warn('[AI_SERVICE] API key not configured');
    }
  }

  private async makeRequest(prompt: string): Promise<AIResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'AI API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for a note-taking application. Provide concise, helpful responses.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const result = data.choices[0]?.message?.content || '';

      return { success: true, data: result };
    } catch (error) {
      console.error('[AI_SERVICE] Request failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async summarize(text: string): Promise<AIResponse> {
    const prompt = `请用中文总结以下内容，保持简洁明了：\n\n${text}`;
    return this.makeRequest(prompt);
  }

  async expand(text: string): Promise<AIResponse> {
    const prompt = `请用中文扩展以下内容，提供更详细的信息和见解：\n\n${text}`;
    return this.makeRequest(prompt);
  }

  async translate(text: string, targetLanguage: string = '中文'): Promise<AIResponse> {
    const prompt = `请将以下内容翻译成${targetLanguage}：\n\n${text}`;
    return this.makeRequest(prompt);
  }

  async generateSummary(noteContent: string): Promise<AIResponse> {
    const prompt = `请为这篇笔记生成一个简洁的摘要，突出关键观点和要点：\n\n${noteContent}`;
    return this.makeRequest(prompt);
  }

  async generateTimeline(content: string): Promise<AIResponse> {
    const prompt = `请根据以下内容生成一个时间线，按时间顺序列出重要事件：\n\n${content}`;
    return this.makeRequest(prompt);
  }

  async askAboutNote(question: string, noteContent: string): Promise<AIResponse> {
    const prompt = `基于以下笔记内容回答问题：\n\n笔记内容：${noteContent}\n\n问题：${question}`;
    return this.makeRequest(prompt);
  }
}

// Singleton instance
let aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!aiService) {
    aiService = new AIService();
  }
  return aiService;
}
