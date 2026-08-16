export type AppErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_SESSION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "PAYMENT_REQUIRED"
  | "PAYLOAD_TOO_LARGE"
  | "OPTION_FULL"
  | "AUXILIARY_OPTION_FULL"
  | "AUXILIARY_MINIMUM_NOT_MET"
  | "AUXILIARY_MAXIMUM_EXCEEDED"
  | "POLL_FULL"
  | "SERVICE_UNAVAILABLE"
  | "SETUP_REQUIRED"
  | "TOO_MANY_REQUESTS";

export class AppError extends Error {
  code: AppErrorCode;
  constructor({
    code,
    message,
    cause,
  }: {
    code: AppErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(`[${code}]: ${message}`);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}
