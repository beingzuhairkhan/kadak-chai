import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { SortOrder } from 'mongoose';
import { z } from 'zod';
import { Entry, EntryDocument } from '../entries/entry.schema';

const statuses = ['all', 'approved', 'rejected', 'pending_review'] as const;
const categories = ['all', 'funny', 'nostalgic', 'wholesome', 'other'] as const;
const sorts = ['newest', 'oldest', 'name', 'status', 'category'] as const;
const adminQuerySchema = z
  .object({
    status: z.enum(statuses).default('all'),
    category: z.enum(categories).default('all'),
    search: z.string().trim().max(100).default(''),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce
      .number()
      .refine((value) => [10, 20, 50].includes(value))
      .default(10),
    sort: z.enum(sorts).default('newest'),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict()
  .superRefine((query, context) => {
    for (const key of ['from', 'to'] as const) {
      const value = query[key];
      if (value) {
        const date = new Date(`${value}T00:00:00.000Z`);
        if (
          Number.isNaN(date.getTime()) ||
          date.toISOString().slice(0, 10) !== value
        ) {
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'INVALID_DATE',
          });
        }
      }
    }
    if (query.from && query.to && query.from > query.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'INVALID_DATE_RANGE',
      });
    }
  });

export const reviewEntrySchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'pending_review']),
    category: z
      .enum(['funny', 'nostalgic', 'wholesome', 'other'])
      .nullable()
      .optional(),
    caption: z.string().trim().max(300).optional(),
    reason: z.string().trim().max(500).optional(),
    overrideNote: z.string().trim().max(500).optional(),
    expectedUpdatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.caption) {
      const words = value.caption.split(/\s+/).filter(Boolean).length;
      if (words > 12)
        context.addIssue({
          code: 'custom',
          path: ['caption'],
          message: 'CAPTION_TOO_LONG',
        });
    }
  });

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseQuery(raw: unknown) {
  const parsed = adminQuerySchema.safeParse(raw);
  if (!parsed.success) {
    throw new BadRequestException({
      code: 'INVALID_QUERY',
      fieldErrors: { query: 'Invalid filters.' },
    });
  }
  return parsed.data;
}

function csvCell(value: unknown) {
  let text = '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    text = String(value);
  } else if (value instanceof Date) {
    text = value.toISOString();
  } else if (value !== null && value !== undefined) {
    text = JSON.stringify(value) ?? '';
  }
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Entry.name) private readonly entryModel: Model<EntryDocument>,
  ) {}

  private buildFilter(query: ReturnType<typeof parseQuery>) {
    const selectedStatus = query.status === 'all' ? undefined : query.status;
    const selectedCategory =
      query.category === 'all' ? undefined : query.category;
    const safeSearch = query.search ? escapeRegex(query.search) : '';
    const createdAt: { $gte?: Date; $lt?: Date } = {};
    if (query.from) createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) {
      createdAt.$lt = new Date(`${query.to}T00:00:00.000Z`);
      createdAt.$lt.setUTCDate(createdAt.$lt.getUTCDate() + 1);
    }
    return {
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(safeSearch
        ? {
            $or: [
              { name: { $regex: safeSearch, $options: 'i' } },
              { city: { $regex: safeSearch, $options: 'i' } },
              { email: { $regex: safeSearch, $options: 'i' } },
              { phone: { $regex: safeSearch, $options: 'i' } },
              { contactValue: { $regex: safeSearch, $options: 'i' } },
              { story: { $regex: safeSearch, $options: 'i' } },
            ],
          }
        : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };
  }

  private buildSort(sort: (typeof sorts)[number]): Record<string, SortOrder> {
    if (sort === 'oldest') return { createdAt: 1 as const };
    if (sort === 'name') return { name: 1 as const };
    if (sort === 'status')
      return { status: 1 as const, createdAt: -1 as const };
    if (sort === 'category')
      return { category: 1 as const, createdAt: -1 as const };
    return { createdAt: -1 as const };
  }

  async listEntries(rawQuery: unknown) {
    const filters = parseQuery(rawQuery);
    const query = this.buildFilter(filters);
    const offset = (filters.page - 1) * filters.pageSize;
    const [items, total] = await Promise.all([
      this.entryModel
        .find(query)
        .sort(this.buildSort(filters.sort))
        .skip(offset)
        .limit(filters.pageSize)
        .lean()
        .exec(),
      this.entryModel.countDocuments(query).exec(),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async exportCsv(rawQuery: unknown) {
    const filters = parseQuery(rawQuery);
    const rows = await this.entryModel
      .find(this.buildFilter(filters))
      .sort(this.buildSort(filters.sort))
      .limit(10000)
      .lean()
      .exec();
    const columns = [
      'name',
      'city',
      'email',
      'phone',
      'contactValue',
      'story',
      'aiCategory',
      'aiDecision',
      'status',
      'createdAt',
    ] as const;
    const lines = [
      columns.map(csvCell).join(','),
      ...rows.map((entry) => {
        const values: Record<(typeof columns)[number], unknown> = {
          name: entry.name,
          city: entry.city,
          email: entry.email,
          phone: entry.phone,
          contactValue: entry.contactValue,
          story: entry.story,
          aiCategory: entry.aiCategory,
          aiDecision: entry.aiDecision,
          status: entry.status,
          createdAt: entry.createdAt,
        };
        return columns.map((key) => csvCell(values[key])).join(',');
      }),
    ];
    return `\uFEFF${lines.join('\r\n')}`;
  }

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Entry not found.');
    const entry = await this.entryModel.findById(id).lean().exec();
    if (!entry) throw new NotFoundException('Entry not found.');
    return entry;
  }

  async updateReview(id: string, rawPayload: unknown, reviewedBy: string) {
    const parsed = reviewEntrySchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'INVALID_REVIEW',
        fieldErrors: { review: 'Invalid review data.' },
      });
    }
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Entry not found.');
    const payload = parsed.data;
    const updated = await this.entryModel
      .findOneAndUpdate(
        { _id: id, updatedAt: new Date(payload.expectedUpdatedAt) },
        {
          $set: {
            status: payload.status,
            category: payload.category ?? null,
            caption: payload.caption || null,
            rejectionReason: payload.reason || null,
            adminOverrideReason: payload.overrideNote || null,
            overrideNote: payload.overrideNote || null,
            overriddenAt: new Date(),
            reviewedAt: new Date(),
            reviewedBy,
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (updated) return updated;
    const exists = await this.entryModel.exists({ _id: id });
    if (!exists) throw new NotFoundException('Entry not found.');
    throw new ConflictException(
      'This submission changed since you opened it. Reload before saving.',
    );
  }

  async getStats() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const trendStart = new Date(today);
    trendStart.setDate(trendStart.getDate() - 13);
    const [
      total,
      approved,
      rejected,
      pending,
      todayCount,
      fallbackCount,
      trends,
    ] = await Promise.all([
      this.entryModel.countDocuments({}).exec(),
      this.entryModel.countDocuments({ status: 'approved' }).exec(),
      this.entryModel.countDocuments({ status: 'rejected' }).exec(),
      this.entryModel.countDocuments({ status: 'pending_review' }).exec(),
      this.entryModel.countDocuments({ createdAt: { $gte: today } }).exec(),
      this.entryModel.countDocuments({ aiProvider: 'secondary' }).exec(),
      this.entryModel
        .aggregate<{ _id: string; count: number }>([
          { $match: { createdAt: { $gte: trendStart } } },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
    ]);
    const trendCounts = new Map(
      trends.map((trend) => [trend._id, trend.count]),
    );
    const dailyTrends = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(trendStart);
      date.setUTCDate(date.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      return { _id: dateKey, count: trendCounts.get(dateKey) || 0 };
    });
    return {
      total,
      approved,
      rejected,
      pending,
      today: todayCount,
      fallback: fallbackCount,
      trends: dailyTrends,
    };
  }
}
