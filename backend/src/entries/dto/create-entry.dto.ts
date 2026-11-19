import { Allow } from 'class-validator';

export class CreateEntryDto {
  @Allow()
  name?: unknown;

  @Allow()
  city?: unknown;

  @Allow()
  email?: unknown;

  @Allow()
  phone?: unknown;

  @Allow()
  story?: unknown;

  @Allow()
  consent?: unknown;

  @Allow()
  website?: unknown;

  @Allow()
  startedAt?: unknown;
}
