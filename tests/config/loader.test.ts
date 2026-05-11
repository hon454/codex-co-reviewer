import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  symlink,
  writeFile,
} from "node:fs/promises";
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
  const sourceRepoRoot = path.join(root, "source-repo");
  await Promise.all([
    mkdir(profileRoot, { recursive: true }),
    mkdir(dataRoot, { recursive: true }),
    mkdir(stateRoot, { recursive: true }),
    mkdir(logRoot, { recursive: true }),
  ]);
  await cp(fixtureSourceRepo, sourceRepoRoot, { recursive: true });

  const sourceRepo = await realpath(sourceRepoRoot);
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
    expect(result.value.projects[0]?.contextFiles).toEqual([]);
    expect(result.value.projects[0]?.policy.autoApprove).toBe(false);
  });

  it("resolves project context files relative to the canonical project root", async () => {
    const contents = [
      "github:",
      "  username: fixture-user",
      "projects:",
      "  - id: alpha",
      "    repo: owner/repo",
      "    localPath: __FIXTURE_SOURCE_REPO__",
      "    promptFile: profiles/alpha/review.md",
      "    contextFiles:",
      "      - README.md",
      "",
    ].join("\n");
    const { configPath, roots, sourceRepo } = await materializeConfig(contents);
    const contextFile = await realpath(path.join(sourceRepo, "README.md"));

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected config to load");
    expect(result.value.projects[0]?.contextFiles).toEqual([contextFile]);
  });

  it("remaps project context file path errors with project metadata", async () => {
    const contents = [
      "github:",
      "  username: fixture-user",
      "projects:",
      "  - id: alpha",
      "    repo: owner/repo",
      "    localPath: __FIXTURE_SOURCE_REPO__",
      "    promptFile: profiles/alpha/review.md",
      "    contextFiles:",
      "      - README.md",
      "      - docs/missing.md",
      "",
    ].join("\n");
    const { configPath, roots } = await materializeConfig(contents);

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected config to fail");
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "CONFIG_PATH_NOT_FOUND",
        path: ["projects", 0, "contextFiles", 1],
        metadata: expect.objectContaining({ projectId: "alpha", index: 0 }),
      }),
    );
  });

  it("rejects unsafe project context file paths", async () => {
    const { configPath, roots, sourceRepo } = await materializeConfig();
    const outside = path.join(path.dirname(sourceRepo), "outside.md");
    await writeFile(outside, "outside");
    await symlink(outside, path.join(sourceRepo, "linked-outside.md"));
    const unsafeConfig = [
      "github:",
      "  username: fixture-user",
      "projects:",
      "  - id: alpha",
      "    repo: owner/repo",
      "    localPath: __FIXTURE_SOURCE_REPO__",
      "    promptFile: profiles/alpha/review.md",
      "    contextFiles:",
      `      - ${path.join(sourceRepo, "README.md")}`,
      "      - docs/../README.md",
      "      - linked-outside.md",
      "",
    ].join("\n");
    await writeFile(
      configPath,
      unsafeConfig.replace("__FIXTURE_SOURCE_REPO__", sourceRepo),
    );

    const result = await loadConfigFromFile(configPath, roots);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected config to fail");
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CONFIG_PATH_UNSAFE",
          path: ["projects", 0, "contextFiles", 0],
        }),
        expect.objectContaining({
          code: "CONFIG_PATH_UNSAFE",
          path: ["projects", 0, "contextFiles", 1],
        }),
        expect.objectContaining({
          code: "CONFIG_PATH_UNSAFE",
          path: ["projects", 0, "contextFiles", 2],
        }),
      ]),
    );
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

  it("fully redacts config paths with delimiters in loader errors", async () => {
    const root = await tempRoot();
    const configRoot = path.join(root, "My Project (Final)", "config");
    const dataRoot = path.join(root, "data");
    const stateRoot = path.join(root, "state");
    const logRoot = path.join(root, "log");
    await Promise.all([
      mkdir(configRoot, { recursive: true }),
      mkdir(dataRoot, { recursive: true }),
      mkdir(stateRoot, { recursive: true }),
      mkdir(logRoot, { recursive: true }),
    ]);
    const configPath = path.join(configRoot, "config.yaml");
    await writeFile(configPath, "github:\n  username: [\n");

    const result = await loadConfigFromFile(configPath, {
      configRoot,
      dataRoot,
      stateRoot,
      logRoot,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected parse failure");
    expect(result.errors[0]?.redactedMessage).toContain("[REDACTED_PATH]");
    expect(result.errors[0]?.redactedMessage).not.toContain("My Project (Final)");
    expect(result.errors[0]?.redactedMessage).not.toContain(")/config.yaml");
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
