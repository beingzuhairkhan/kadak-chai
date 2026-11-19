import { BadRequestException, Inject } from '@nestjs/common';

const mockInject = Inject;

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));
jest.mock('@nestjs/mongoose', () => {
  return {
    InjectModel: () => mockInject('EntryModel'),
    getModelToken: () => 'EntryModel',
  };
});
jest.mock('./entry.schema', () => ({
  Entry: class Entry {},
}));
jest.mock('../moderation/moderation.service', () => ({
  ModerationService: class ModerationService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Entry } from './entry.schema';
import { EntriesService } from './entries.service';
import { ModerationService } from '../moderation/moderation.service';

class MockEntryModel {
  static findOne = jest.fn();
  _id = { toString: () => 'entry-id' };
  save = jest.fn().mockResolvedValue(undefined);

  constructor(values?: Record<string, unknown>) {
    Object.assign(this, values);
  }
}

describe('EntriesService public responses', () => {
  let service: EntriesService;
  const enqueue = jest.fn().mockResolvedValue(true);

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        { provide: getModelToken(Entry.name), useValue: MockEntryModel },
        { provide: ModerationService, useValue: { enqueue } },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-salt' },
        },
      ],
    }).compile();

    service = module.get(EntriesService);
  });

  it('returns a safe public path and story after saving and enqueueing', async () => {
    const response = await service.createEntry({
      name: 'Aarav Sharma',
      city: 'Mumbai',
      email: 'aarav@example.com',
      story: 'A chai break with my family.',
      consent: true,
      website: '',
      startedAt: Date.now() - 4000,
    });

    expect(enqueue).toHaveBeenCalledWith('entry-id');
    expect(response.success).toBe(true);
    expect(response.data).toMatchObject({
      status: 'pending_review',
    });
    expect(response.data.publicId).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(response.data.resultPath).toMatch(/^\/entry\/[A-Za-z0-9_-]+$/);
    expect(Object.keys(response.data).sort()).toEqual([
      'publicId',
      'resultPath',
      'status',
    ]);
    expect(response.data).not.toHaveProperty('name');
    expect(response.data).not.toHaveProperty('city');
    expect(response.data).not.toHaveProperty('story');
    expect(response.data).not.toHaveProperty('email');
    expect(response.data).not.toHaveProperty('phone');
    expect(response.data).not.toHaveProperty('duplicateFingerprint');
  });

  it('rejects stories over 300 characters with HTTP 400 validation details', async () => {
    const error = await service
      .createEntry({
        name: 'Aarav Sharma',
        city: 'Mumbai',
        email: 'aarav@example.com',
        story: '😀'.repeat(301),
        consent: true,
        website: '',
        startedAt: Date.now() - 4000,
      })
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect(error).toBeInstanceOf(BadRequestException);
    if (error instanceof BadRequestException) {
      expect(error.getStatus()).toBe(400);
      expect(error.getResponse()).toMatchObject({
        code: 'VALIDATION_FAILED',
        fieldErrors: { story: 'STORY_TOO_LONG' },
      });
    }
  });

  it.each([
    ['pending_review', null, null],
    ['rejected', null, null],
    ['approved', 'wholesome', 'A lovely chai moment.'],
  ] as const)(
    'returns only approved moderation output for %s entries',
    async (status, category, caption) => {
      MockEntryModel.findOne.mockReturnValue({
        lean: () => ({
          exec: jest.fn().mockResolvedValue({
            publicId: 'public-id',
            name: 'Aarav Sharma',
            city: 'Mumbai',
            story: 'A chai break with my family.',
            status,
            category: 'wholesome',
            caption: 'A lovely chai moment.',
            email: 'private@example.com',
            phone: '+911234567890',
            aiRaw: 'internal model response',
            aiError: 'internal queue error',
          }),
        }),
      });

      const response = await service.getPublicEntry('public-id');

      if (status === 'rejected') {
        expect(response).toEqual({
          publicId: 'public-id',
          status: 'rejected',
        });
      } else {
        expect(response).toEqual({
          publicId: 'public-id',
          name: 'Aarav',
          city: 'Mumbai',
          story: 'A chai break with my family.',
          status,
          category,
          caption,
        });
      }
    },
  );
});
