import { Injectable } from '@angular/core';

export interface SpanContext {
  traceId: string;
  spanId: string;
}

export interface Span {
  spanContext(): SpanContext;
}

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private activeTraceId = this.generateId(32);

  getActiveSpan(): Span {
    return {
      spanContext: () => ({
        traceId: this.activeTraceId,
        spanId: this.generateId(16)
      })
    };
  }

  regenerateTrace() {
    this.activeTraceId = this.generateId(32);
  }

  private generateId(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
