import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiModule } from '../ai/ai.module';
import { Entry, EntrySchema } from '../entries/entry.schema';
import { ModerationService } from './moderation.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Entry.name, schema: EntrySchema }]),
    AiModule,
  ],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
