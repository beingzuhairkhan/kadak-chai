import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EntryDocument = HydratedDocument<Entry>;

@Schema({ timestamps: true })
export class Entry {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  city: string;

  @Prop({ type: String, trim: true, default: null })
  email?: string | null;

  @Prop({ type: String, trim: true, default: null })
  phone?: string | null;

  @Prop({ required: true, trim: true })
  story: string;

  @Prop({ required: true })
  consent: boolean;

  @Prop({ type: Date, required: true, default: Date.now })
  consentAt: Date;

  @Prop({ required: true, enum: ['email', 'phone'] })
  contactType: 'email' | 'phone';

  @Prop({ required: true, trim: true })
  contactValue: string;

  @Prop({ type: String, trim: true })
  contactKey?: string;

  @Prop({
    required: true,
    enum: ['approved', 'rejected', 'pending_review'],
    default: 'pending_review',
  })
  status: 'approved' | 'rejected' | 'pending_review';

  @Prop({
    type: String,
    enum: ['funny', 'nostalgic', 'wholesome', 'other', null],
    default: null,
  })
  category: 'funny' | 'nostalgic' | 'wholesome' | 'other' | null;

  @Prop({ type: String, trim: true, default: null })
  caption?: string | null;

  @Prop({ type: String, trim: true, default: null })
  rejectionReason?: string | null;

  @Prop({ required: true })
  publicId: string;

  @Prop({ type: String, enum: ['approved', 'rejected'], default: null })
  aiDecision?: 'approved' | 'rejected' | null;

  @Prop({ type: String, trim: true, default: null })
  aiReason?: string | null;

  @Prop({
    type: String,
    enum: ['funny', 'nostalgic', 'wholesome', 'other', null],
    default: null,
  })
  aiCategory?: 'funny' | 'nostalgic' | 'wholesome' | 'other' | null;

  @Prop({ type: String, trim: true, default: null })
  aiCaption?: string | null;

  @Prop({ type: String, maxlength: 2000, default: null })
  aiRaw?: string | null;

  @Prop({ type: String, maxlength: 500, default: null })
  aiError?: string | null;

  @Prop({ type: String, trim: true, default: null })
  aiProvider?: string | null;

  @Prop({ type: String, trim: true, default: null })
  aiModel?: string | null;

  @Prop({ default: 0 })
  aiAttempts: number;

  @Prop({ default: 0 })
  aiLatencyMs: number;

  @Prop({ type: Date, default: null })
  aiProcessedAt?: Date | null;

  @Prop({ type: Date, default: null })
  reviewedAt?: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reviewedBy?: string | null;

  @Prop({ type: String, trim: true, default: null })
  adminOverrideReason?: string | null;

  @Prop({ type: Date, default: null })
  overriddenAt?: Date | null;

  @Prop({ type: String, trim: true, maxlength: 500, default: null })
  overrideNote?: string | null;

  @Prop({ type: String, trim: true, default: null })
  ipHash?: string | null;
}

export const EntrySchema = SchemaFactory.createForClass(Entry);
EntrySchema.index({ status: 1, createdAt: -1 });
EntrySchema.index({ category: 1, createdAt: -1 });
EntrySchema.index({ createdAt: -1 });
EntrySchema.index({ publicId: 1 }, { unique: true });
EntrySchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);
EntrySchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } },
);
EntrySchema.index(
  { contactKey: 1 },
  {
    unique: true,
    partialFilterExpression: { contactKey: { $type: 'string' } },
  },
);
