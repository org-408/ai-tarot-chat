import type {
  ReadingErrorCode,
  ReadingErrorPhase,
  ReadingErrorResponse,
} from "../../../../shared/lib/types";
import i18n from "../../i18n";

export class ReadingChatError extends Error {
  readonly status: number;
  readonly code: ReadingErrorCode | "UNKNOWN";
  readonly retryable: boolean;
  readonly phase?: ReadingErrorPhase;
  readonly details?: Record<string, unknown>;

  constructor({
    message,
    status,
    code,
    retryable,
    phase,
    details,
  }: {
    message: string;
    status: number;
    code: ReadingErrorCode | "UNKNOWN";
    retryable: boolean;
    phase?: ReadingErrorPhase;
    details?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "ReadingChatError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.phase = phase;
    this.details = details;
  }
}

function isReadingErrorResponse(value: unknown): value is ReadingErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    "retryable" in value &&
    "phase" in value
  );
}

export async function createReadingChatErrorFromResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (isReadingErrorResponse(payload)) {
      return new ReadingChatError({
        message: payload.message,
        status: response.status,
        code: payload.code,
        retryable: payload.retryable,
        phase: payload.phase,
        details: payload.details,
      });
    }
  }

  const message =
    (await response.text().catch(() => "")) ||
    i18n.t("error.readingRequestFailed");

  return new ReadingChatError({
    message,
    status: response.status,
    code: "UNKNOWN",
    retryable: response.status >= 500,
  });
}

export function isReadingChatError(error: unknown): error is ReadingChatError {
  return error instanceof ReadingChatError;
}
