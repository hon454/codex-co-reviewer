import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runProjectList, runProjectValidate } from "../../src/cli/project.js";
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

  it("prints JSON project list success", async () => {
    const paths = await materializeConfig();

    const result = await runProjectList(paths, true);

    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      projects: [{ id: "alpha", repo: "owner/repo" }],
    });
    expect(result.exitCode).toBe(0);
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
