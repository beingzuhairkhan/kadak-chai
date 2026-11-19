import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderConfig } from '../provider';

@Injectable()
export class GroqAIProvider {
  constructor(private readonly config: ConfigService) {}

  getConfig(): ProviderConfig {
    return {
      label: 'primary',
      baseUrl: this.config.getOrThrow<string>('AI_BASE_URL'),
      apiKey: this.config.getOrThrow<string>('AI_API_KEY'),
      model: this.config.getOrThrow<string>('AI_MODEL'),
    };
  }

  getFallbackConfig(): ProviderConfig | null {
    const baseUrl = this.config.get<string>('AI_BASE_URL');
    const apiKey = this.config.get<string>('AI_API_KEY');
    const model = this.config.get<string>('AI_MODEL');
    if (!baseUrl || !apiKey || !model) return null;
    return { label: 'secondary', baseUrl, apiKey, model };
  }
}
