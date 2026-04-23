import {
  ReadingErrorCode,
  ReadingErrorPhase,
  ReadingErrorResponse,
} from "@/../shared/lib/types";
import { NextResponse } from "next/server";

type ReadingRouteErrorOptions = {
  code: ReadingErrorCode;
  message: string;
  status: number;
  phase: ReadingErrorPhase;
  retryable?: boolean;
  details?: Record<string, unknown>;
};

const retryableByCode: Record<ReadingErrorCode, boolean> = {
  UNAUTHORIZED: false,
  LIMIT_REACHED: false,
  PLAN_INSUFFICIENT: false,
  QUESTION_TOO_SHORT: false,
  QUESTION_TOO_LONG: false,
  MODERATION_BLOCKED: false,
  PROVIDER_TEMPORARY_FAILURE: true,
  NETWORK_OR_STREAM_FAILURE: true,
  INTERNAL_ERROR: true,
};

export class ReadingRouteError extends Error {
  readonly code: ReadingErrorCode;
  readonly status: number;
  readonly phase: ReadingErrorPhase;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;

  constructor({
    code,
    message,
    status,
    phase,
    retryable = retryableByCode[code],
    details,
  }: ReadingRouteErrorOptions) {
    super(message);
    this.name = "ReadingRouteError";
    this.code = code;
    this.status = status;
    this.phase = phase;
    this.retryable = retryable;
    this.details = details;
  }
}

export function createReadingErrorResponse({
  code,
  message,
  status,
  phase,
  retryable = retryableByCode[code],
  details,
}: ReadingRouteErrorOptions) {
  return NextResponse.json<ReadingErrorResponse>(
    {
      code,
      message,
      retryable,
      phase,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (/rate.?limit|too.many.request|quota|429/i.test(error.message)) return true;
  if ("statusCode" in error && (error as { statusCode: number }).statusCode === 429) return true;
  if ("status" in error && (error as { status: number }).status === 429) return true;
  return false;
}

export function createReadingUnexpectedErrorResponse(
  error: unknown,
  fallback: ReadingRouteErrorOptions
) {
  if (error instanceof ReadingRouteError) {
    return createReadingErrorResponse({
      code: error.code,
      message: error.message,
      status: error.status,
      phase: error.phase,
      retryable: error.retryable,
      details: error.details,
    });
  }

  return createReadingErrorResponse(fallback);
}
