import { readFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import { makeConfigError, type ConfigError } from "./errors.js";
import {
  createPathResolver,
  resolveProjectContextFilePath,
  resolveProjectLocalPath,
  resolveToolOwnedPath,
  type PathResolverInput,
} from "./paths.js";
import {
  buildEffectiveConfig,
  type ConfigResult,
  type EffectiveConfig,
} from "./schema.js";

export type LoadConfigRoots = PathResolverInput;
export type LoadedConfig = EffectiveConfig;

export async function loadConfigFromFile(
  configPath: string,
  roots: LoadConfigRoots,
): Promise<ConfigResult<LoadedConfig>> {
  let source: string;
  try {
    source = await readFile(configPath, "utf8");
  } catch {
    return {
      ok: false,
      errors: [
        makeConfigError({
          code: "CONFIG_PATH_NOT_FOUND",
          path: [],
          message: `Config file does not exist or is not accessible. Path: ${configPath}`,
        }),
      ],
    };
  }

  const document = parseDocument(source);
  if (document.errors.length > 0) {
    return {
      ok: false,
      errors: document.errors.map((error) =>
        makeConfigError({
          code: "CONFIG_YAML_PARSE_FAILED",
          path: [],
          message: `Failed to parse YAML config at ${configPath}: ${error.message}`,
        }),
      ),
    };
  }

  let rawConfig: unknown;
  try {
    rawConfig = document.toJSON();
  } catch (error) {
    return {
      ok: false,
      errors: [
        makeConfigError({
          code: "CONFIG_YAML_PARSE_FAILED",
          path: [],
          message: `Failed to parse YAML config at ${configPath}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        }),
      ],
    };
  }

  const configResult = buildEffectiveConfig(rawConfig);
  if (!configResult.ok) {
    return configResult;
  }

  const resolver = createPathResolver(roots);
  const resolvedProjects: LoadedConfig["projects"] = [];
  const pathErrors: ConfigError[] = [];

  for (const [index, project] of configResult.value.projects.entries()) {
    const promptFile = await resolveToolOwnedPath(
      resolver,
      "config",
      project.promptFile,
    );
    const localPath = await resolveProjectLocalPath(project.localPath);

    if (!promptFile.ok) {
      pathErrors.push(
        ...remapPathErrors(promptFile.errors, ["projects", index, "promptFile"], {
          projectId: project.id,
          index,
        }),
      );
    }

    if (!localPath.ok) {
      pathErrors.push(
        ...remapPathErrors(localPath.errors, ["projects", index, "localPath"], {
          projectId: project.id,
          index,
        }),
      );
    }

    const contextFiles: string[] = [];
    if (localPath.ok) {
      for (const [contextIndex, contextFile] of project.contextFiles.entries()) {
        const resolvedContextFile = await resolveProjectContextFilePath(
          localPath.value,
          contextFile,
        );
        if (resolvedContextFile.ok) {
          contextFiles.push(resolvedContextFile.value);
        } else {
          pathErrors.push(
            ...remapPathErrors(
              resolvedContextFile.errors,
              ["projects", index, "contextFiles", contextIndex],
              {
                projectId: project.id,
                index,
              },
            ),
          );
        }
      }
    }

    if (promptFile.ok && localPath.ok && contextFiles.length === project.contextFiles.length) {
      resolvedProjects.push({
        ...project,
        promptFile: promptFile.value,
        localPath: localPath.value,
        contextFiles,
      });
    }
  }

  if (pathErrors.length > 0) {
    return { ok: false, errors: pathErrors };
  }

  return {
    ok: true,
    value: {
      ...configResult.value,
      projects: resolvedProjects,
    },
  };
}

function remapPathErrors(
  errors: ConfigError[],
  path: ConfigError["path"],
  metadata: ConfigError["metadata"],
): ConfigError[] {
  return errors.map((error) => ({
    ...error,
    path,
    metadata: { ...error.metadata, ...metadata },
  }));
}
