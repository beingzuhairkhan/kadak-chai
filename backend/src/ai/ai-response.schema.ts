import { z } from 'zod';
import { AI_CATEGORIES, AI_DECISIONS } from './ai-provider.interface';

const captionWords = (caption: string) =>
  caption.trim().split(/\s+/).filter(Boolean).length;

export const aiResponseSchema = z
  .object({
    decision: z.enum(AI_DECISIONS),
    reason: z.string().nullable(),
    category: z.enum(AI_CATEGORIES),
    caption: z.string().min(1, 'Caption is required.'),
  })
  .strict()
  .superRefine((value, ctx) => {
    const normalizedCaption = value.caption.trim();
    const wordCount = captionWords(normalizedCaption);

    if (wordCount === 0 || wordCount > 12) {
      ctx.addIssue({
        code: 'custom',
        path: ['caption'],
        message: 'Caption must be between 1 and 12 words.',
      });
    }

    if (value.decision === 'approved' && value.reason !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Approved stories cannot include a rejection reason.',
      });
    }

    if (
      value.decision === 'rejected' &&
      (!value.reason || value.reason.trim().length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Rejected stories require a short reason.',
      });
    }
  });

export type AiResponse = z.infer<typeof aiResponseSchema>;
