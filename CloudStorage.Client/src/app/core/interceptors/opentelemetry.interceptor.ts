import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TelemetryService } from '../services/telemetry.service';

export const opentelemetryInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const telemetry = inject(TelemetryService);
  const activeSpan = telemetry.getActiveSpan();
  
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    const traceparent = `00-${spanContext.traceId}-${spanContext.spanId}-01`;
    const cloned = req.clone({
      headers: req.headers.set('traceparent', traceparent)
    });
    return next(cloned);
  }
  
  return next(req);
};
