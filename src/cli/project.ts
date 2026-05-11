import { loadConfigFromFile } from "../config/loader.js";
import type { LocalPaths } from "../platform/roots.js";
import {
  formatConfigErrorsJson,
  formatConfigErrorsText,
  formatJson,
  formatProjectListText,
  formatValidationSuccessText,
} from "./output.js";

export interface CliCommandResult {
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}

export async function runProjectValidate(
  paths: LocalPaths,
  json: boolean,
): Promise<CliCommandResult> {
  const result = await loadConfigFromFile(paths.configPath, paths);
  if (!result.ok) {
    return {
      exitCode: 1,
      stdout: json
        ? formatJson({ ok: false, errors: formatConfigErrorsJson(result.errors) })
        : `${formatConfigErrorsText(result.errors)}\n`,
      stderr: "",
    };
  }

  return {
    exitCode: 0,
    stdout: json
      ? formatJson({ ok: true, projectCount: result.value.projects.length })
      : `${formatValidationSuccessText(result.value.projects.length)}\n`,
    stderr: "",
  };
}

export async function runProjectList(
  paths: LocalPaths,
  json: boolean,
): Promise<CliCommandResult> {
  const result = await loadConfigFromFile(paths.configPath, paths);
  if (!result.ok) {
    return {
      exitCode: 1,
      stdout: json
        ? formatJson({ ok: false, errors: formatConfigErrorsJson(result.errors) })
        : `${formatConfigErrorsText(result.errors)}\n`,
      stderr: "",
    };
  }

  const projects = result.value.projects.map((project) => ({
    id: project.id,
    repo: project.repo,
  }));

  return {
    exitCode: 0,
    stdout: json
      ? formatJson({ ok: true, projects })
      : `${formatProjectListText(projects)}\n`,
    stderr: "",
  };
}
