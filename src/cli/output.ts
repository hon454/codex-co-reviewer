import type { ConfigError } from "../config/errors.js";

export interface ProjectListItem {
  id: string;
  repo: string;
}

export function formatValidationSuccessText(projectCount: number): string {
  return `Configuration is valid. Projects: ${projectCount}`;
}

export function formatProjectListText(projects: ProjectListItem[]): string {
  return projects.map((project) => `${project.id}\t${project.repo}`).join("\n");
}

export function formatConfigErrorsText(errors: ConfigError[]): string {
  return [
    "Configuration is invalid.",
    ...errors.map(
      (error) =>
        `- ${error.code} at ${formatErrorPath(error.path)}: ${error.redactedMessage}`,
    ),
  ].join("\n");
}

export function formatConfigErrorsJson(errors: ConfigError[]): Array<{
  code: ConfigError["code"];
  path: ConfigError["path"];
  message: string;
  metadata: ConfigError["metadata"];
}> {
  return errors.map((error) => ({
    code: error.code,
    path: error.path,
    message: error.redactedMessage,
    metadata: error.metadata,
  }));
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatErrorPath(path: ConfigError["path"]): string {
  return path.length === 0 ? "<root>" : path.join(".");
}
