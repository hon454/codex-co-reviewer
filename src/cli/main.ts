#!/usr/bin/env node
import { homedir } from "node:os";
import { resolveLocalPaths } from "../platform/roots.js";
import { parseCliArgs } from "./args.js";
import {
  runProjectList,
  runProjectValidate,
  type CliCommandResult,
} from "./project.js";

export interface RunCliInput {
  argv: string[];
  env: NodeJS.ProcessEnv;
  homeDirectory: string;
}

export async function runCli(input: RunCliInput): Promise<CliCommandResult> {
  const parsed = parseCliArgs(input.argv);
  if (!parsed.ok) {
    return { exitCode: 2, stdout: "", stderr: `${parsed.message}\n` };
  }

  if (parsed.command === "help") {
    return { exitCode: 0, stdout: `${HELP_TEXT}\n`, stderr: "" };
  }

  const paths = resolveLocalPaths(
    { env: input.env, homeDirectory: input.homeDirectory },
    parsed.paths,
  );

  if (parsed.command === "project-validate") {
    return runProjectValidate(paths, parsed.json);
  }

  return runProjectList(paths, parsed.json);
}

const HELP_TEXT = [
  "codex-co-reviewer",
  "",
  "Commands:",
  "  codex-co-reviewer project validate [--json]",
  "  codex-co-reviewer project list [--json]",
  "",
  "Path flags:",
  "  --config <path>",
  "  --config-root <path>",
  "  --data-root <path>",
  "  --state-root <path>",
  "  --log-root <path>",
].join("\n");

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCli({
    argv: process.argv.slice(2),
    env: process.env,
    homeDirectory: homedir(),
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
