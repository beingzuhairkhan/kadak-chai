import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { validateEnvironment } from './config/env.validation';
import { Entry, EntryDocument, EntrySchema } from './entries/entry.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      validate: validateEnvironment,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    MongooseModule.forFeature([{ name: Entry.name, schema: EntrySchema }]),
  ],
})
class SeedModule {}

async function seed() {
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: false,
  });
  try {
    const entries = app.get<Model<EntryDocument>>(getModelToken(Entry.name));
    const existingCount = await entries.estimatedDocumentCount().exec();
    if (existingCount > 0) {
      console.info('Demo seed skipped: the entries collection is not empty.');
      return;
    }

    const consentAt = new Date();
    const samples = [
      {
        name: 'Aarav Demo',
        city: 'Pune',
        email: 'aarav.demo@example.invalid',
        contactType: 'email' as const,
        contactValue: 'aarav.demo@example.invalid',
        story:
          'One rainy evening, chai and a shared umbrella turned a long commute into my favorite memory.',
        status: 'approved' as const,
        category: 'nostalgic' as const,
        caption: 'Rain, chai, and a little kindness.',
        aiDecision: 'approved' as const,
      },
      {
        name: 'Meera Demo',
        city: 'Jaipur',
        email: 'meera.demo@example.invalid',
        contactType: 'email' as const,
        contactValue: 'meera.demo@example.invalid',
        story:
          'My grandmother always knew the right amount of ginger for every kind of day.',
        status: 'pending_review' as const,
        category: null,
        caption: null,
        aiDecision: null,
      },
      {
        name: 'Kabir Demo',
        city: 'Delhi',
        email: 'kabir.demo@example.invalid',
        contactType: 'email' as const,
        contactValue: 'kabir.demo@example.invalid',
        story:
          'We laughed so hard at the tea stall that the chai went cold before anyone noticed.',
        status: 'rejected' as const,
        category: 'funny' as const,
        caption: null,
        aiDecision: 'rejected' as const,
      },
    ];

    await entries.insertMany(
      samples.map((sample) => ({
        ...sample,
        phone: null,
        contactKey: sample.contactValue.toLowerCase(),
        consent: true,
        consentAt,
        publicId: randomUUID(),
        aiReason: sample.aiDecision ? 'Demo moderation result.' : null,
        aiCategory: sample.category,
        aiCaption: sample.caption,
        aiRaw: JSON.stringify({ demo: true, decision: sample.aiDecision }),
        aiProvider: 'mock',
        aiModel: 'demo',
        aiAttempts: sample.aiDecision ? 1 : 0,
        aiLatencyMs: 1,
        ipHash: null,
      })),
    );
    console.info('Added three demo submissions.');
  } finally {
    await app.close();
  }
}

void seed().catch(() => {
  console.error(
    'Demo seed failed. Check MongoDB connectivity and configuration.',
  );
  process.exitCode = 1;
});
