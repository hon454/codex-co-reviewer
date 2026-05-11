import path from "node:path";
import type { LoadConfigRoots } from "../config/loader.js";

export interface LocalPathEnvironment {
  env: NodeJS.ProcessEnv;
  homeDirectory: string;
}

export interface LocalPathOverrides {
  configPath?: string;
  configRoot?: string;
  dataRoot?: string;
  stateRoot?: string;
  logRoot?: string;
}

export interface LocalPaths extends LoadConfigRoots {
  configPath: string;
}

const APP_DIR = "codex-co-reviewer";

export function resolveDefaultLocalPaths(
  environment: LocalPathEnvironment,
): LocalPaths {
  const configBase =
    environment.env.XDG_CONFIG_HOME ??
    path.join(environment.homeDirectory, ".config");
  const dataBase =
    environment.env.XDG_DATA_HOME ??
    path.join(environment.homeDirectory, ".local", "share");
  const stateBase =
    environment.env.XDG_STATE_HOME ??
    path.join(environment.homeDirectory, ".local", "state");

  const configRoot = path.join(configBase, APP_DIR);
  const stateRoot = path.join(stateBase, APP_DIR);

  return {
    configPath: path.join(configRoot, "config.yaml"),
    configRoot,
    dataRoot: path.join(dataBase, APP_DIR),
    stateRoot,
    logRoot: path.join(stateRoot, "logs"),
  };
}

export function resolveLocalPaths(
  environment: LocalPathEnvironment,
  overrides: LocalPathOverrides,
): LocalPaths {
  const defaults = resolveDefaultLocalPaths(environment);
  return {
    configPath: resolveOverride(overrides.configPath, defaults.configPath),
    configRoot: resolveOverride(overrides.configRoot, defaults.configRoot),
    dataRoot: resolveOverride(overrides.dataRoot, defaults.dataRoot),
    stateRoot: resolveOverride(overrides.stateRoot, defaults.stateRoot),
    logRoot: resolveOverride(overrides.logRoot, defaults.logRoot),
  };
}

function resolveOverride(value: string | undefined, fallback: string): string {
  return path.resolve(value ?? fallback);
}
