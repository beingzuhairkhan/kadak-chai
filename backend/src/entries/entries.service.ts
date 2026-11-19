import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { CreateEntryDto } from './dto/create-entry.dto';
import { Entry, EntryDocument } from './entry.schema';
import { createEntrySchema, ValidatedCreateEntry } from './entry-validation';
import { ModerationService } from '../moderation/moderation.service';

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class EntriesService implements OnModuleInit {
  private readonly logger = new Logger(EntriesService.name);

  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<EntryDocument>,
    private readonly moderationService: ModerationService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.entryModel.collection.createIndex(
        { contactKey: 1 },
        {
          unique: true,
          partialFilterExpression: { contactKey: { $type: 'string' } },
        },
      );
      await this.entryModel.collection.createIndex(
        { publicId: 1 },
        { unique: true },
      );
      await this.entryModel.collection.createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: 'string' } },
        },
      );
      await this.entryModel.collection.createIndex(
        { phone: 1 },
        {
          unique: true,
          partialFilterExpression: { phone: { $type: 'string' } },
        },
      );
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error(
          'Existing duplicate contact or public IDs prevent required unique indexes from being created.',
        );
      }
      throw new Error('Could not create required entry indexes.');
    }
  }

  private sanitizeCreateDto(dto: CreateEntryDto): ValidatedCreateEntry {
    const result = createEntrySchema.safeParse(dto);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        fieldErrors[String(issue.path[0] || 'form')] = issue.message;
      }
      throw new BadRequestException({ code: 'VALIDATION_FAILED', fieldErrors });
    }
    return result.data;
  }

  private generatePublicId() {
    return randomBytes(18).toString('base64url');
  }

  private hashIp(ip?: string) {
    if (!ip) return null;
    const salt = this.config.getOrThrow<string>('IP_HASH_SALT');
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }

  private pendingResponse() {
    return {
      success: true,
      message: "Thanks! We're reviewing your story.",
      data: { status: 'pending_review' as const },
    };
  }

  private firstName(name: string) {
    return name.trim().split(/\s+/)[0] || name;
  }

  async createEntry(dto: CreateEntryDto, clientIp?: string) {
    const normalized = this.sanitizeCreateDto(dto);
    if (normalized.website || Date.now() - normalized.startedAt < 3000) {
      return this.pendingResponse();
    }

    const entry = new this.entryModel({
      name: normalized.name,
      city: normalized.city,
      email: normalized.email || null,
      phone: normalized.phone || null,
      contactType: normalized.contactType,
      contactValue: normalized.contactValue,
      contactKey: normalized.contactKey,
      story: normalized.story,
      consent: true,
      consentAt: new Date(),
      status: 'pending_review',
      publicId: this.generatePublicId(),
      aiAttempts: 0,
      aiLatencyMs: 0,
      ipHash: this.hashIp(clientIp),
    });

    try {
      await entry.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('This email/phone has already entered.');
      }
      throw error;
    }

    await this.moderationService.enqueue(entry._id.toString());
    return {
      success: true,
      message: "Thanks! We're reviewing your story.",
      data: {
        publicId: entry.publicId,
        status: entry.status,
        resultPath: `/entry/${entry.publicId}`,
      },
    };
  }

  async getPublicEntry(publicId: string) {
    const entry = await this.entryModel.findOne({ publicId }).lean().exec();
    if (!entry) throw new NotFoundException('Entry not found.');

    if (entry.status === 'rejected') {
      return {
        publicId: entry.publicId,
        status: entry.status,
      };
    }

    return {
      publicId: entry.publicId,
      name: this.firstName(entry.name),
      city: entry.city,
      story: entry.story,
      status: entry.status,
      category: entry.status === 'approved' ? entry.category : null,
      caption: entry.status === 'approved' ? entry.caption : null,
    };
  }
}
