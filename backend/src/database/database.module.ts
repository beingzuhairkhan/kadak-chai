import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer: MongoMemoryServer | null = null;

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('MONGODB_URI');

        if (mongoUri) {
          return {
            uri: mongoUri,
            dbName: configService.get<string>('MONGODB_DB') || undefined,
          };
        }

        if (configService.get<string>('NODE_ENV') === 'production') {
          throw new Error(
            'MONGODB_URI is required in production; in-memory database fallback is development-only.',
          );
        }

        new Logger('DatabaseModule').warn(
          'MONGODB_URI is missing; using a temporary in-memory database. Submitted data will be lost on shutdown.',
        );
        memoryServer = await MongoMemoryServer.create();
        return {
          uri: memoryServer.getUri(),
          dbName: 'kadak-chai-test',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
