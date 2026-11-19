import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type SafeErrorBody = {
  code?: string;
  fieldErrors?: Record<string, string>;
  message?: string | string[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const parserStatus =
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof exception.status === 'number'
        ? exception.status
        : undefined;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : parserStatus === 400 || parserStatus === 413
          ? parserStatus
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawBody =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body = safeErrorBody(rawBody);
    const message =
      parserStatus === 400
        ? 'Malformed JSON request.'
        : status === 413
          ? 'Request body is too large.'
          : status >= 500
            ? 'Request failed.'
            : typeof body?.message === 'string'
              ? body.message
              : 'Invalid request.';

    this.logger.error(`${request.method} ${request.path} -> ${status}`);
    if (status === 429) {
      response.setHeader(
        'Retry-After',
        String(process.env.RATE_LIMIT_WINDOW_SECONDS || 60),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? 'Invalid request.' : message,
      ...(body?.code ? { code: body.code } : {}),
      ...(body?.fieldErrors ? { fieldErrors: body.fieldErrors } : {}),
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }
}

function safeErrorBody(value: unknown): SafeErrorBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const body: SafeErrorBody = {};
  if ('code' in value && typeof value.code === 'string') body.code = value.code;
  if (
    'message' in value &&
    (typeof value.message === 'string' || Array.isArray(value.message))
  ) {
    body.message = value.message as string | string[];
  }
  if (
    'fieldErrors' in value &&
    typeof value.fieldErrors === 'object' &&
    value.fieldErrors !== null
  ) {
    const errors: Record<string, string> = {};
    for (const [key, message] of Object.entries(value.fieldErrors)) {
      if (typeof message === 'string') errors[key] = message;
    }
    body.fieldErrors = errors;
  }
  return body;
}
