# CLI Config Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the completed config core through local CLI commands that can validate and list configured projects without touching GitHub, Codex, daemon state, worktrees, or artifacts.

**Architecture:** Add a small dependency-free CLI layer over `src/config`. Keep path-root resolution in a platform helper, argument parsing in a CLI helper, command behavior in focused command modules, and output formatting deterministic for tests. The slice is read-only except for normal process stdout/stderr and does not invoke `gh`.

**Tech Stack:** TypeScript, Node.js built-ins, Zod/YAML config core, Vitest, `tsc`.

**Spec:** `docs/specs/0002-cli-config-validation.md`

---

## Scope

Implement `docs/specs/0002-cli-config-validation.md`.

Add these commands:

```sh
codex-co-reviewer project validate
codex-co-reviewer project validate --json
codex-co-reviewer project list
codex-co-reviewer project list --json
codex-co-reviewer --help
```

Supported path flags for local testing and scripted use:

```sh
--config <path>
--config-root <path>
--data-root <path>
--state-root <path>
--log-root <path>
```

Default macOS paths:

```text
~/.config/codex-co-reviewer/config.yaml
~/.config/codex-co-reviewer
~/.local/share/codex-co-reviewer
~/.local/state/codex-co-reviewer
~/.local/state/codex-co-reviewer/logs
```

Exit codes:

- `0`: command succeeded.
- `1`: configuration validation failed.
- `2`: CLI usage error or unexpected local runtime error.

Out of scope for this slice:

- `gh` authentication checks.
- Repository access checks.
- Daemon start/stop/status.
- SQLite migrations.
- Codex CLI availability checks.
- GitHub reads or writes.
- Review eligibility scans.
- Artifact storage.

## File Structure

- Create `src/platform/roots.ts`: resolves default local roots from environment
  and home directory input, plus CLI path overrides.
- Create `tests/platform/roots.test.ts`: deterministic root resolution tests.
- Create `src/cli/args.ts`: dependency-free argument parser for supported
  commands and flags.
- Create `tests/cli/args.test.ts`: command parsing and usage-error tests.
- Create `src/cli/output.ts`: deterministic text and JSON formatting helpers.
- Create `tests/cli/output.test.ts`: redacted error and project-list formatter
  tests.
- Create `src/cli/project.ts`: `project validate` and `project list` command
  handlers backed by `loadConfigFromFile`.
- Create `tests/cli/project.test.ts`: command behavior tests using temporary
  config fixtures.
- Create `src/cli/main.ts`: executable entrypoint that parses argv, dispatches
  commands, writes output, and sets exit codes.
- Create `tests/cli/main.test.ts`: entrypoint dispatch tests with injected IO.
- Create `tsconfig.build.json`: build config that emits only `src/**/*.ts`.
- Modify `package.json`: add `build` script and `bin` entry.
- Modify `README.md`: mark `project validate` and `project list` as the first
  executable CLI commands once this plan is implemented.

## Task 1: Platform Root Resolution

**Files:**

- Create: `src/platform/roots.ts`
- Create: `tests/platform/roots.test.ts`

- [ ] **Step 1: Write root resolver tests**

Create `tests/platform/roots.test.ts`:

```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultLocalPaths,
  resolveLocalPaths,
} from "../../src/platform/roots.js";

describe("local path root resolution", () => {
  it("uses macOS-style defaults from the provided home directory", () => {
    const paths = resolveDefaultLocalPaths({
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(paths).toEqual({
      configPath: "/Users/example/.config/codex-co-reviewer/config.yaml",
      configRoot: "/Users/example/.config/codex-co-reviewer",
      dataRoot: "/Users/example/.local/share/codex-co-reviewer",
      stateRoot: "/Users/example/.local/state/codex-co-reviewer",
      logRoot: "/Users/example/.local/state/codex-co-reviewer/logs",
    });
  });

  it("honors XDG root variables", () => {
    const paths = resolveDefaultLocalPaths({
      env: {
        XDG_CONFIG_HOME: "/tmp/config",
        XDG_DATA_HOME: "/tmp/data",
        XDG_STATE_HOME: "/tmp/state",
      },
      homeDirectory: "/Users/example",
    });

    expect(paths).toEqual({
      configPath: "/tmp/config/codex-co-reviewer/config.yaml",
      configRoot: "/tmp/config/codex-co-reviewer",
      dataRoot: "/tmp/data/codex-co-reviewer",
      stateRoot: "/tmp/state/codex-co-reviewer",
      logRoot: "/tmp/state/codex-co-reviewer/logs",
    });
  });

  it("applies explicit CLI path overrides after defaults", () => {
    const paths = resolveLocalPaths(
      { env: {}, homeDirectory: "/Users/example" },
      {
        configPath: "fixtures/config.yaml",
        dataRoot: "tmp/data",
      },
    );

    expect(paths.configPath).toBe(path.resolve("fixtures/config.yaml"));
    expect(paths.configRoot).toBe("/Users/example/.config/codex-co-reviewer");
    expect(paths.dataRoot).toBe(path.resolve("tmp/data"));
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
npm test -- tests/platform/roots.test.ts
```

Expected result:

```text
FAIL tests/platform/roots.test.ts
Cannot find module '../../src/platform/roots.js'
```

- [ ] **Step 3: Implement root resolver**

Create `src/platform/roots.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```sh
npm test -- tests/platform/roots.test.ts
```

Expected result:

```text
PASS tests/platform/roots.test.ts
```

- [ ] **Step 5: Commit**

```sh
git add src/platform/roots.ts tests/platform/roots.test.ts
git commit -m "feat: add local path root resolver"
```

## Task 2: CLI Argument Parser

**Files:**

- Create: `src/cli/args.ts`
- Create: `tests/cli/args.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/cli/args.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCliArgs } from "../../src/cli/args.js";

describe("CLI argument parser", () => {
  it("parses project validate with JSON output and path overrides", () => {
    const result = parseCliArgs([
      "project",
      "validate",
      "--json",
      "--config",
      "fixture/config.yaml",
      "--data-root",
      "fixture/data",
    ]);

    expect(result).toEqual({
      ok: true,
      command: "project-validate",
      json: true,
      paths: {
        configPath: "fixture/config.yaml",
        dataRoot: "fixture/data",
      },
    });
  });

  it("parses project list", () => {
    expect(parseCliArgs(["project", "list"])).toEqual({
      ok: true,
      command: "project-list",
      json: false,
      paths: {},
    });
  });

  it("parses help", () => {
    expect(parseCliArgs(["--help"])).toEqual({
      ok: true,
      command: "help",
      json: false,
      paths: {},
    });
  });

  it("rejects unsupported commands", () => {
    const result = parseCliArgs(["start"]);

    expect(result).toEqual({
      ok: false,
      message: 'Unsupported command: start',
    });
  });

  it("rejects flags that require a value", () => {
    const result = parseCliArgs(["project", "validate", "--config"]);

    expect(result).toEqual({
      ok: false,
      message: "Flag --config requires a value.",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
npm test -- tests/cli/args.test.ts
```

Expected result:

```text
FAIL tests/cli/args.test.ts
Cannot find module '../../src/cli/args.js'
```

- [ ] **Step 3: Implement parser**

Create `src/cli/args.ts`:

```ts
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
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg in PATH_FLAGS) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, message: `Flag ${arg} requires a value.` };
      }
      paths[PATH_FLAGS[arg]] = value;
      index += 1;
      continue;
    }
    commandArgs.push(arg);
  }

  if (commandArgs.length === 0 || isHelp(commandArgs)) {
    return { ok: true, command: "help", json, paths };
  }

  if (commandArgs[0] === "project" && commandArgs[1] === "validate") {
    return { ok: true, command: "project-validate", json, paths };
  }

  if (commandArgs[0] === "project" && commandArgs[1] === "list") {
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
    (commandArgs[0] === "--help" || commandArgs[0] === "-h" || commandArgs[0] === "help")
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```sh
npm test -- tests/cli/args.test.ts
```

Expected result:

```text
PASS tests/cli/args.test.ts
```

- [ ] **Step 5: Commit**

```sh
git add src/cli/args.ts tests/cli/args.test.ts
git commit -m "feat: parse config CLI commands"
```

## Task 3: CLI Output Formatting

**Files:**

- Create: `src/cli/output.ts`
- Create: `tests/cli/output.test.ts`

- [ ] **Step 1: Write formatter tests**

Create `tests/cli/output.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeConfigError } from "../../src/config/errors.js";
import {
  formatConfigErrorsText,
  formatConfigErrorsJson,
  formatProjectListText,
  formatValidationSuccessText,
} from "../../src/cli/output.js";

describe("CLI output formatting", () => {
  it("formats validation success without local absolute paths", () => {
    expect(formatValidationSuccessText(2)).toBe(
      "Configuration is valid. Projects: 2",
    );
  });

  it("formats project list with ids and repositories only", () => {
    expect(
      formatProjectListText([
        { id: "alpha", repo: "owner/repo" },
        { id: "beta", repo: "owner/other" },
      ]),
    ).toBe(["alpha\towner/repo", "beta\towner/other"].join("\n"));
  });

  it("formats config errors with redacted display messages", () => {
    const errors = [
      makeConfigError({
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message: "Configured config path does not exist. Path: /Users/example/secret/profile.md",
        metadata: { projectId: "alpha" },
      }),
    ];

    expect(formatConfigErrorsText(errors)).toBe(
      [
        "Configuration is invalid.",
        "- CONFIG_PATH_NOT_FOUND at projects.0.promptFile: Configured config path does not exist. Path: [REDACTED_PATH]",
      ].join("\n"),
    );
  });

  it("formats config errors for JSON without raw messages", () => {
    const errors = [
      makeConfigError({
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message: "Configured config path does not exist. Path: /Users/example/secret/profile.md",
        metadata: { projectId: "alpha" },
      }),
    ];

    expect(formatConfigErrorsJson(errors)).toEqual([
      {
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "promptFile"],
        message: "Configured config path does not exist. Path: [REDACTED_PATH]",
        metadata: { projectId: "alpha" },
      },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
npm test -- tests/cli/output.test.ts
```

Expected result:

```text
FAIL tests/cli/output.test.ts
Cannot find module '../../src/cli/output.js'
```

- [ ] **Step 3: Implement formatter**

Create `src/cli/output.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```sh
npm test -- tests/cli/output.test.ts
```

Expected result:

```text
PASS tests/cli/output.test.ts
```

- [ ] **Step 5: Commit**

```sh
git add src/cli/output.ts tests/cli/output.test.ts
git commit -m "feat: format config CLI output"
```

## Task 4: Project Command Handlers

**Files:**

- Create: `src/cli/project.ts`
- Create: `tests/cli/project.test.ts`

- [ ] **Step 1: Write command handler tests**

Create `tests/cli/project.test.ts`:

```ts
import { cp, mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  runProjectList,
  runProjectValidate,
} from "../../src/cli/project.js";
import type { LocalPaths } from "../../src/platform/roots.js";

const fixtureRoot = path.resolve("tests/fixtures/config/valid-basic");
const fixtureConfig = path.join(fixtureRoot, "config.yaml");
const fixtureSourceRepo = path.join(fixtureRoot, "source-repo");

async function materializeConfig(): Promise<LocalPaths> {
  const root = await mkdtemp(path.join(tmpdir(), "codex-co-reviewer-cli-"));
  const configRoot = path.join(root, "config");
  const dataRoot = path.join(root, "data");
  const stateRoot = path.join(root, "state");
  const logRoot = path.join(root, "log");
  const profileRoot = path.join(configRoot, "profiles", "alpha");
  const sourceRepoRoot = path.join(root, "source-repo");

  await Promise.all([
    mkdir(profileRoot, { recursive: true }),
    mkdir(dataRoot, { recursive: true }),
    mkdir(stateRoot, { recursive: true }),
    mkdir(logRoot, { recursive: true }),
  ]);
  await cp(fixtureSourceRepo, sourceRepoRoot, { recursive: true });

  const sourceRepo = await realpath(sourceRepoRoot);
  const configContents = (await readFile(fixtureConfig, "utf8")).replace(
    "__FIXTURE_SOURCE_REPO__",
    sourceRepo,
  );
  const configPath = path.join(configRoot, "config.yaml");
  await writeFile(configPath, configContents);
  await writeFile(
    path.join(profileRoot, "review.md"),
    await readFile(path.join(fixtureRoot, "profiles", "alpha", "review.md"), "utf8"),
  );

  return { configPath, configRoot, dataRoot, stateRoot, logRoot };
}

describe("project CLI commands", () => {
  it("validates a valid configuration", async () => {
    const paths = await materializeConfig();

    const result = await runProjectValidate(paths, false);

    expect(result).toEqual({
      exitCode: 0,
      stdout: "Configuration is valid. Projects: 1\n",
      stderr: "",
    });
  });

  it("prints JSON validation success", async () => {
    const paths = await materializeConfig();

    const result = await runProjectValidate(paths, true);

    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      projectCount: 1,
    });
    expect(result.exitCode).toBe(0);
  });

  it("lists configured projects without local absolute paths", async () => {
    const paths = await materializeConfig();

    const result = await runProjectList(paths, false);

    expect(result).toEqual({
      exitCode: 0,
      stdout: "alpha\towner/repo\n",
      stderr: "",
    });
  });

  it("returns redacted validation errors", async () => {
    const paths = await materializeConfig();
    await writeFile(paths.configPath, "github:\n  username: [\n");

    const result = await runProjectValidate(paths, false);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Configuration is invalid.");
    expect(result.stdout).toContain("[REDACTED_PATH]");
    expect(result.stdout).not.toContain(paths.configPath);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
npm test -- tests/cli/project.test.ts
```

Expected result:

```text
FAIL tests/cli/project.test.ts
Cannot find module '../../src/cli/project.js'
```

- [ ] **Step 3: Implement project commands**

Create `src/cli/project.ts`:

```ts
import { loadConfigFromFile } from "../config/loader.js";
import type { LocalPaths } from "../platform/roots.js";
import {
  formatConfigErrorsText,
  formatConfigErrorsJson,
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
    stdout: json ? formatJson({ ok: true, projects }) : `${formatProjectListText(projects)}\n`,
    stderr: "",
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```sh
npm test -- tests/cli/project.test.ts
```

Expected result:

```text
PASS tests/cli/project.test.ts
```

- [ ] **Step 5: Commit**

```sh
git add src/cli/project.ts tests/cli/project.test.ts
git commit -m "feat: add project config CLI commands"
```

## Task 5: CLI Entrypoint and Package Build

**Files:**

- Create: `src/cli/main.ts`
- Create: `tests/cli/main.test.ts`
- Create: `tsconfig.build.json`
- Modify: `package.json`

- [ ] **Step 1: Write entrypoint tests**

Create `tests/cli/main.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/main.js";

describe("CLI entrypoint", () => {
  it("prints help", async () => {
    const result = await runCli({
      argv: ["--help"],
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("codex-co-reviewer project validate");
    expect(result.stderr).toBe("");
  });

  it("returns usage errors with exit code 2", async () => {
    const result = await runCli({
      argv: ["start"],
      env: {},
      homeDirectory: "/Users/example",
    });

    expect(result).toEqual({
      exitCode: 2,
      stdout: "",
      stderr: "Unsupported command: start\n",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```sh
npm test -- tests/cli/main.test.ts
```

Expected result:

```text
FAIL tests/cli/main.test.ts
Cannot find module '../../src/cli/main.js'
```

- [ ] **Step 3: Implement entrypoint**

Create `src/cli/main.ts`:

```ts
#!/usr/bin/env node
import { homedir } from "node:os";
import { parseCliArgs } from "./args.js";
import { runProjectList, runProjectValidate, type CliCommandResult } from "./project.js";
import { resolveLocalPaths } from "../platform/roots.js";

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
```

- [ ] **Step 4: Add build config**

Create `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["tests/**/*.ts", "vitest.config.ts"]
}
```

Modify `package.json` scripts and bin:

```json
{
  "name": "codex-co-reviewer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "codex-co-reviewer": "./dist/cli/main.js"
  },
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "verify": "npm run typecheck && npm test && npm run build"
  }
}
```

Keep existing dependencies and devDependencies unchanged.

- [ ] **Step 5: Run tests and build**

Run:

```sh
npm test -- tests/cli/main.test.ts
npm run build
```

Expected result:

```text
PASS tests/cli/main.test.ts
```

and:

```text
tsc -p tsconfig.build.json
```

exits with code `0`.

- [ ] **Step 6: Commit**

```sh
git add src/cli/main.ts tests/cli/main.test.ts tsconfig.build.json package.json
git commit -m "feat: add CLI entrypoint"
```

## Task 6: Documentation and Full Verification

**Files:**

- Modify: `README.md`
- Modify: `docs/specs/0001-config-core.md`

- [ ] **Step 1: Update status documentation**

Modify `README.md` status to describe the executable commands:

```md
Design and repository harness scaffold with config-core and read-only config
CLI commands in place. Daemon, GitHub review orchestration, and review runtime
implementation have not started yet.
```

Add a short section after planned commands:

````md
## Implemented Commands

```sh
codex-co-reviewer project validate
codex-co-reviewer project list
```

These commands validate and display local project configuration only. They do
not contact GitHub, invoke Codex, start the daemon, create worktrees, persist
artifacts, or submit reviews.
````

Update `docs/specs/0001-config-core.md` by moving CLI commands from the
out-of-scope list into a new "Read-Only CLI Consumers" section once the tests
and build pass.

- [ ] **Step 2: Run required verification**

Run:

```sh
npm run verify
```

Expected result:

```text
typecheck passes
all tests pass
build passes
```

- [ ] **Step 3: Run documentation placeholder scan**

Run:

```sh
rg --no-ignore -n "T[B]D|T[O]DO|fill[[:space:]]+in|implement[[:space:]]+later" AGENTS.md README.md docs .github || true
```

Expected result: no matches from newly edited docs.

- [ ] **Step 4: Commit**

```sh
git add README.md docs/specs/0001-config-core.md
git commit -m "docs: document config CLI slice"
```

## Acceptance Criteria

- `codex-co-reviewer project validate` validates local config through
  `loadConfigFromFile`.
- `codex-co-reviewer project list` prints only project ids and repositories in
  text mode.
- `--json` returns deterministic JSON for success and validation failures.
- Validation failure output uses `redactedMessage`.
- CLI path flags work in tests without relying on the user's real config.
- The default command set does not call `gh`, Codex, SQLite, worktree code, or
  artifact storage.
- `npm run verify` exits with code `0`.
- The documentation placeholder scan returns no matches from the new or changed
  plan/spec content.

## Self-Review Checklist

- Spec coverage: every command, output mode, path input, safety requirement,
  test expectation, documentation update, and acceptance criterion in
  `docs/specs/0002-cli-config-validation.md` maps to a task in this plan.
- Approval boundaries: this plan does not add GitHub writes, change
  authentication, change review decision policy, or change artifact storage
  scope.
- Test strategy: every new module has focused Vitest coverage and the final
  verification command covers typecheck, tests, and build.
- Sensitive output: project list text avoids local absolute paths; validation
  errors use redacted display messages.
