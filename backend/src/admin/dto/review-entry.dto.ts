import { Allow } from 'class-validator';

export class ReviewEntryDto {
  @Allow()
  status?: unknown;

  @Allow()
  category?: unknown;

  @Allow()
  caption?: unknown;

  @Allow()
  reason?: unknown;

  @Allow()
  overrideNote?: unknown;

  @Allow()
  expectedUpdatedAt?: unknown;
}
