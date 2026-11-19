import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { Entry, EntrySchema } from './entry.schema';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Entry.name, schema: EntrySchema }]),
    ModerationModule,
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
