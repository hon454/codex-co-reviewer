import { constants } from "node:fs";
import { access, realpath } from "node:fs/promises";
import path from "node:path";
import { makeConfigError } from "./errors.js";
import type { ConfigResult } from "./schema.js";

export type ToolOwnedRoot = "config" | "data" | "state" | "log";

export interface PathResolver {
  roots: Record<ToolOwnedRoot, string>;
}

export interface PathResolverInput {
  configRoot: string;
  dataRoot: string;
  stateRoot: string;
  logRoot: string;
}

export function createPathResolver(input: PathResolverInput): PathResolver {
  return {
    roots: {
      config: path.resolve(input.configRoot),
      data: path.resolve(input.dataRoot),
      state: path.resolve(input.stateRoot),
      log: path.resolve(input.logRoot),
    },
  };
}

export async function resolveToolOwnedPath(
  resolver: PathResolver,
  rootName: ToolOwnedRoot,
  configuredPath: string,
): Promise<ConfigResult<string>> {
  const root = resolver.roots[rootName];
  if (path.isAbsolute(configuredPath)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      `Configured ${rootName} path must be relative to the selected root.`,
    );
  }

  if (hasNormalizationSurprise(configuredPath)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      `Configured ${rootName} path must not contain traversal or normalization surprises.`,
    );
  }

  const candidate = path.resolve(root, configuredPath);

  if (!isWithinOrEqual(root, candidate)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      `Configured ${rootName} path escapes the allowed root before symlink resolution.`,
    );
  }

  let canonicalRoot: string;
  let canonicalCandidate: string;
  try {
    canonicalRoot = await realpath(root);
    canonicalCandidate = await realpath(candidate);
    await access(canonicalCandidate, constants.R_OK);
  } catch {
    return pathError(
      "CONFIG_PATH_NOT_FOUND",
      configuredPath,
      `Configured ${rootName} path does not exist or is not accessible.`,
    );
  }

  if (!isWithinOrEqual(canonicalRoot, canonicalCandidate)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      `Configured ${rootName} path escapes the allowed root after symlink resolution.`,
    );
  }

  return { ok: true, value: canonicalCandidate };
}

export async function resolveProjectLocalPath(
  configuredPath: string,
): Promise<ConfigResult<string>> {
  if (!path.isAbsolute(configuredPath)) {
    return pathError(
      "CONFIG_PATH_NOT_ABSOLUTE",
      configuredPath,
      "Project local path must be absolute.",
    );
  }

  if (hasNormalizationSurprise(configuredPath)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      "Project local path must not contain traversal or normalization surprises.",
    );
  }

  try {
    const normalizedConfiguredPath = stripTrailingSeparators(
      path.normalize(configuredPath),
    );
    const canonicalPath = await realpath(configuredPath);
    await access(canonicalPath, constants.R_OK | constants.X_OK);
    if (normalizedConfiguredPath !== stripTrailingSeparators(canonicalPath)) {
      return pathError(
        "CONFIG_PATH_UNSAFE",
        configuredPath,
        "Project local path must be configured as its canonical path and must not resolve through symlinks.",
      );
    }
    return { ok: true, value: canonicalPath };
  } catch {
    return pathError(
      "CONFIG_PATH_NOT_FOUND",
      configuredPath,
      "Project local path does not exist or is not accessible.",
    );
  }
}

export async function resolveProjectContextFilePath(
  canonicalProjectRoot: string,
  configuredPath: string,
): Promise<ConfigResult<string>> {
  if (path.isAbsolute(configuredPath)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      "Project context file path must be relative to the project local path.",
    );
  }

  if (hasNormalizationSurprise(configuredPath)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      "Project context file path must not contain traversal or normalization surprises.",
    );
  }

  let canonicalRoot: string;
  try {
    canonicalRoot = await realpath(canonicalProjectRoot);
  } catch {
    return pathError(
      "CONFIG_PATH_NOT_FOUND",
      configuredPath,
      "Project local path does not exist or is not accessible.",
    );
  }

  const candidate = path.resolve(canonicalRoot, configuredPath);

  if (!isWithinOrEqual(canonicalRoot, candidate)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      "Project context file path escapes the project local path before symlink resolution.",
    );
  }

  let canonicalCandidate: string;
  try {
    canonicalCandidate = await realpath(candidate);
    await access(canonicalCandidate, constants.R_OK);
  } catch {
    return pathError(
      "CONFIG_PATH_NOT_FOUND",
      configuredPath,
      "Project context file path does not exist or is not accessible.",
    );
  }

  if (!isWithinOrEqual(canonicalRoot, canonicalCandidate)) {
    return pathError(
      "CONFIG_PATH_UNSAFE",
      configuredPath,
      "Project context file path escapes the project local path after symlink resolution.",
    );
  }

  return { ok: true, value: canonicalCandidate };
}

function pathError(
  code: "CONFIG_PATH_NOT_ABSOLUTE" | "CONFIG_PATH_NOT_FOUND" | "CONFIG_PATH_UNSAFE",
  configuredPath: string,
  message: string,
): ConfigResult<string> {
  return {
    ok: false,
    errors: [
      makeConfigError({
        code,
        path: [],
        message: `${message} Path: ${configuredPath}`,
      }),
    ],
  };
}

function isWithinOrEqual(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function hasNormalizationSurprise(configuredPath: string): boolean {
  const withoutTrailingSeparators = stripTrailingSeparators(configuredPath);
  const normalized = stripTrailingSeparators(path.normalize(configuredPath));
  return withoutTrailingSeparators !== normalized;
}

function stripTrailingSeparators(value: string): string {
  const root = path.parse(value).root;
  let stripped = value;
  while (stripped.length > root.length && stripped.endsWith(path.sep)) {
    stripped = stripped.slice(0, -1);
  }
  return stripped;
}
