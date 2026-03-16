/**
 * Shared API utilities for consistent error handling and responses.
 */
import { NextResponse } from 'next/server';

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
}

/** Return a structured JSON error. Never leaks stack traces. */
export function apiError(message: string, status: number, code?: string, details?: unknown): NextResponse<ApiError> {
  const body: ApiError = { error: message };
  if (code) body.code = code;
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/** Return a structured JSON success response. */
export function apiSuccess<T>(data?: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, ...(data !== undefined ? { data } : {}) }, { status });
}

/** Safely extract error message without leaking internals. */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // In production, don't expose raw error messages from libraries
    if (process.env.NODE_ENV === 'production') {
      return fallback;
    }
    return error.message;
  }
  return fallback;
}
