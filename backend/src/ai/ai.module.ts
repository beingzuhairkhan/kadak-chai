import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { GroqAIProvider } from './providers/groq.provider';
import { MockAIProvider } from './providers/mock.provider';
import { SarvamAIProvider } from './providers/sarvam.provider';

@Module({
  imports: [ConfigModule],
  providers: [AiService, GroqAIProvider, SarvamAIProvider, MockAIProvider],
  exports: [AiService],
})
export class AiModule {}
