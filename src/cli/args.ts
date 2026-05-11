import type { LocalPathOverrides } from "../platform/roots.js";

export type CliCommand = "help" | "project-validate" | "project-list";

export type ParsedCliArgs =
  | {
      ok: true;
      command: CliCommand;
      json: boolean;
      paths: LocalPathOverrides;
    }
  | { ok: false; message: string };

const PATH_FLAGS: Record<string, keyof LocalPathOverrides> = {
  "--config": "configPath",
  "--config-root": "configRoot",
  "--data-root": "dataRoot",
  "--state-root": "stateRoot",
  "--log-root": "logRoot",
};

export function parseCliArgs(args: string[]): ParsedCliArgs {
  const commandArgs: string[] = [];
  const paths: LocalPathOverrides = {};
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) {
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg in PATH_FLAGS) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, message: `Flag ${arg} requires a value.` };
      }
      const pathKey = PATH_FLAGS[arg];
      if (pathKey !== undefined) {
        paths[pathKey] = value;
      }
      index += 1;
      continue;
    }
    commandArgs.push(arg);
  }

  if (commandArgs.length === 0 || isHelp(commandArgs)) {
    return { ok: true, command: "help", json, paths };
  }

  if (
    commandArgs.length === 2 &&
    commandArgs[0] === "project" &&
    commandArgs[1] === "validate"
  ) {
    return { ok: true, command: "project-validate", json, paths };
  }

  if (
    commandArgs.length === 2 &&
    commandArgs[0] === "project" &&
    commandArgs[1] === "list"
  ) {
    return { ok: true, command: "project-list", json, paths };
  }

  return {
    ok: false,
    message: `Unsupported command: ${commandArgs.join(" ")}`,
  };
}

function isHelp(commandArgs: string[]): boolean {
  return (
    commandArgs.length === 1 &&
    (commandArgs[0] === "--help" ||
      commandArgs[0] === "-h" ||
      commandArgs[0] === "help")
  );
}
