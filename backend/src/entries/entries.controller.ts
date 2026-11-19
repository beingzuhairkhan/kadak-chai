import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { CreateEntryDto } from './dto/create-entry.dto';
import { EntriesService } from './entries.service';

@Controller({ path: 'entries', version: '1' })
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  @Throttle({
    default: {
      limit: Number(process.env.RATE_LIMIT_MAX || 30),
      ttl: Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 60) * 1000,
    },
  })
  async create(@Body() dto: CreateEntryDto, @Req() request: Request) {
    if (!request.is('application/json')) {
      throw new UnsupportedMediaTypeException('JSON is required.');
    }
    const forwardedIp = request.get('x-forwarded-for')?.split(',')[0]?.trim();
    const clientIp =
      process.env.TRUST_PROXY === 'true'
        ? forwardedIp || request.ip
        : request.ip;
    return this.entriesService.createEntry(dto, clientIp);
  }

  @Get(':publicId')
  async getPublicEntry(@Param('publicId') publicId: string) {
    return this.entriesService.getPublicEntry(publicId);
  }
}
