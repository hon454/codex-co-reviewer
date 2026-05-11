export type ConfigErrorCode =
  | "CONFIG_YAML_PARSE_FAILED"
  | "CONFIG_SCHEMA_INVALID"
  | "CONFIG_INVALID_ENUM"
  | "CONFIG_INVALID_REPO"
  | "CONFIG_INVALID_PROJECT_ID"
  | "CONFIG_DUPLICATE_PROJECT_ID"
  | "CONFIG_INVALID_BOUNDS"
  | "CONFIG_POLICY_VIOLATION"
  | "CONFIG_PATH_UNSAFE"
  | "CONFIG_PATH_NOT_FOUND"
  | "CONFIG_PATH_NOT_ABSOLUTE";

export type ConfigErrorPathSegment = string | number;

export interface ConfigErrorInput {
  code: ConfigErrorCode;
  path: ConfigErrorPathSegment[];
  message: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ConfigError {
  code: ConfigErrorCode;
  path: ConfigErrorPathSegment[];
  message: string;
  redactedMessage: string;
  metadata: Record<string, string | number | boolean>;
}

const AUTHORIZATION_PATTERN =
  /^[ \t]*Authorization\s*:\s*[A-Za-z][A-Za-z0-9+.-]*\s+\S+[ \t]*$/gim;
const PROMPT_PATTERN = /^\s*prompt\s*:\s*.*$/gim;
const SECRET_PATTERN =
  /\b(?:github_pat_[A-Za-z0-9_]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|sk-[A-Za-z0-9_-]{16,}|[A-Z][A-Z0-9_]*(?:TOKEN|KEY|SECRET)=[^\s"'`]+)\b/g;
const USER_PATH_PATTERN = /\/Users\/[^\s"'`]+/g;

export function redactForDisplay(value: string): string {
  return value
    .replace(AUTHORIZATION_PATTERN, "[REDACTED_AUTHORIZATION]")
    .replace(PROMPT_PATTERN, "[REDACTED_PROMPT]")
    .replace(SECRET_PATTERN, "[REDACTED_SECRET]")
    .replace(USER_PATH_PATTERN, "[REDACTED_PATH]");
}

export function makeConfigError(input: ConfigErrorInput): ConfigError {
  return {
    code: input.code,
    path: input.path,
    message: input.message,
    redactedMessage: redactForDisplay(input.message),
    metadata: input.metadata ?? {},
  };
}
