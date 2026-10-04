import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';

interface ObservedRequest {
  method: string;
  originalUrl?: string;
  url: string;
  user?: { id?: string };
}

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestObservabilityInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const request = context.switchToHttp().getRequest<ObservedRequest>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const route = request.originalUrl || request.url;

    return next.handle().pipe(
      tap(() => this.writeLog('request_completed', request, route, response.statusCode, startedAt)),
      catchError((error: { status?: number; statusCode?: number }) => {
        this.writeLog('request_failed', request, route, error.status || error.statusCode || 500, startedAt);
        return throwError(() => error);
      })
    );
  }

  private writeLog(event: string, request: ObservedRequest, route: string, statusCode: number, startedAt: number) {
    this.logger.log(JSON.stringify({
      event,
      method: request.method,
      route,
      statusCode,
      durationMs: Date.now() - startedAt,
      userId: request.user?.id || null,
      timestamp: new Date().toISOString()
    }));
  }
}
