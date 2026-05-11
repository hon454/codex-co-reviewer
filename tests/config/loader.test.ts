import { mkdir, mkdtemp, readFile, realpath, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfigFromFile, type LoadConfigRoots } from "../../src/config/loader.js";

const fixtureRoot = path.resolve("tests/fixtures/config/valid-basic");
const fixtureConfig = path.join(fixtureRoot, "config.yaml");
const fixtureSourceRepo = path.join(fixtureRoot, "source-repo");

async function tempRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "codex-co-reviewer-loader-"));
}

async function materializeConfig(
  contents?: string,
): Promise<{ configPath: string; roots: LoadConfigRoots; sourceRepo: string }> {
  const root = await tempRoot();
  const configRoot = path.join(root, "config");
  const dataRoot = path.join(root, "data");
  const stateRoot = path.join(root, "state");
  const logRoot = path.join(root, "log");
  const profileRoot = path.join(configRoot, "profiles", "alpha");
  await Promise.all([
    mkdir(profileRoot, { recursive: true }),
    mkdir(dataRoot, { recursive: true }),
    mkdir(stateRoot, { recursive: true }),
    mkdir(logRoot, { recursive: true }),
  ]);

  const sourceRepo = await realpath(fixtureSourceRepo);
  const configContents = contents ?? (await readFile(fixtureConfig, "utf8"));
  await writeFile(
    path.join(configRoot, "config.yaml"),
    configContents.replace("__FIXTURE_SOURCE_REPO__", sourceRepo),
  );
  await writeFile(
    path.join(profileRoot, "review.md"),
    await readFile(path.join(fixtureRoot, "profiles", "alpha", "review.md"), "utf8"),
  );

  return {
    configPath: path.join(configRoot, "config.yaml"),
    roots: { configRoot, dataRoot, stateRoot, logRoot },
    sourceRepo,
  };
}

describe("YAML config loader", () => {
  it("loads YAML, applies defaults, and resolves paths", async () => {
    const { configPath, roots, sourceRepo } = await materializeConfig();
    const promptPath = await realpath(
      path.join(roots.configRoot, "profiles", "alpha", "review.md"),
    );

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected config to load");
    expect(result.value.github.username).toBe("fixture-user");
    expect(result.value.scheduler).toEqual({
      intervalSeconds: 120,
      jitterSeconds: 20,
    });
    expect(result.value.projects[0]?.id).toBe("alpha");
    expect(result.value.projects[0]?.promptFile).toBe(promptPath);
    expect(result.value.projects[0]?.localPath).toBe(sourceRepo);
    expect(result.value.projects[0]?.policy.autoApprove).toBe(false);
  });

  it("returns redacted YAML parse errors", async () => {
    const { configPath, roots } = await materializeConfig("github:\n  username: [\n");

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected parse failure");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_YAML_PARSE_FAILED",
        path: [],
      }),
    );
    expect(result.errors[0]?.redactedMessage).toContain("[REDACTED_PATH]");
    expect(result.errors[0]?.redactedMessage).not.toContain(configPath);
  });

  it("does not perform runtime environment validation", async () => {
    const contents = [
      "github:",
      "  username: fixture-user",
      "backends:",
      "  codex_cli:",
      "    command: definitely-not-installed-codex-fixture",
      "projects:",
      "  - id: alpha",
      "    repo: owner/repo",
      "    localPath: __FIXTURE_SOURCE_REPO__",
      "    promptFile: profiles/alpha/review.md",
      "",
    ].join("\n");
    const { configPath, roots } = await materializeConfig(contents);

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(true);
  });
});
