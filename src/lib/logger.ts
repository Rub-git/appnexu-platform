/**
 * Lightweight structured logger for production.
 * - Outputs JSON in production for Vercel log parsing.
 * - Human-readable in development.
 * - NEVER logs secrets, passwords, or full stack traces to clients.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  event: string;
  message: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === 'production';

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  const REDACTED_KEYS = ['password', 'secret', 'token', 'authorization', 'cookie', 'stripe_secret', 'api_key'];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (REDACTED_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level: LogLevel, event: string, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    event,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? sanitize(meta) : {}),
  };

  if (isProd) {
    // Structured JSON for Vercel log drains
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(JSON.stringify(entry));
  } else {
    const prefix = `[${level.toUpperCase()}] [${event}]`;
    const metaStr = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`${prefix} ${message}${metaStr}`);
  }
}

export const logger = {
  info: (event: string, message: string, meta?: Record<string, unknown>) => log('info', event, message, meta),
  warn: (event: string, message: string, meta?: Record<string, unknown>) => log('warn', event, message, meta),
  error: (event: string, message: string, meta?: Record<string, unknown>) => log('error', event, message, meta),
};
