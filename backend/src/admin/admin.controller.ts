import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { ReviewEntryDto } from './dto/review-entry.dto';
import type { Request, Response } from 'express';

type AdminRequest = Request & { user?: { username: string } };

@UseGuards(AdminGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly config: ConfigService,
  ) {}

  @Get('entries')
  async listEntries(@Query() query: Record<string, unknown>) {
    return this.adminService.listEntries(query);
  }

  @Get('entries/export.csv')
  async exportCsv(@Query() query: Record<string, unknown>, @Res() response: Response) {
    const csv = await this.adminService.exportCsv(query);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="chai-submissions.csv"');
    response.send(csv);
  }

  @Get('entries/:id')
  async getById(@Param('id') id: string) {
    return this.adminService.getById(id);
  }

  @Patch('entries/:id/review')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewEntryDto,
    @Req() request: AdminRequest,
  ) {
    this.assertSameOrigin(request);
    return this.adminService.updateReview(id, dto, request.user?.username || 'admin');
  }

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  private assertSameOrigin(request: Request) {
    if (request.get('origin') !== this.config.getOrThrow<string>('FRONTEND_URL')) {
      throw new ForbiddenException('Invalid request origin.');
    }
  }
}
