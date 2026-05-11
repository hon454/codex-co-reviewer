import { mkdtemp, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPathResolver,
  resolveProjectLocalPath,
  resolveToolOwnedPath,
} from "../../src/config/paths.js";

async function tempRoot(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "codex-co-reviewer-paths-"));
}

describe("config path resolution", () => {
  it("resolves prompt paths relative to the config root", async () => {
    const root = await tempRoot();
    const configRoot = path.join(root, "config");
    const dataRoot = path.join(root, "data");
    const stateRoot = path.join(root, "state");
    const logRoot = path.join(root, "log");
    await Promise.all([
      mkdir(path.join(configRoot, "profiles", "alpha"), { recursive: true }),
      mkdir(dataRoot, { recursive: true }),
      mkdir(stateRoot, { recursive: true }),
      mkdir(logRoot, { recursive: true }),
    ]);
    const promptPath = path.join(configRoot, "profiles", "alpha", "review.md");
    await writeFile(promptPath, "review guidance");

    const resolver = createPathResolver({ configRoot, dataRoot, stateRoot, logRoot });
    const result = await resolveToolOwnedPath(
      resolver,
      "config",
      "profiles/alpha/review.md",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected prompt path to resolve");
    await expect(realpath(result.value)).resolves.toBe(await realpath(promptPath));
  });

  it("rejects tool-owned traversal outside the selected root", async () => {
    const root = await tempRoot();
    const configRoot = path.join(root, "config");
    const dataRoot = path.join(root, "data");
    const stateRoot = path.join(root, "state");
    const logRoot = path.join(root, "log");
    await Promise.all([
      mkdir(configRoot, { recursive: true }),
      mkdir(dataRoot, { recursive: true }),
      mkdir(stateRoot, { recursive: true }),
      mkdir(logRoot, { recursive: true }),
    ]);
    const escapedPath = path.join(root, "outside.md");
    await writeFile(escapedPath, "outside");

    const resolver = createPathResolver({ configRoot, dataRoot, stateRoot, logRoot });
    const result = await resolveToolOwnedPath(resolver, "config", "../outside.md");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected traversal to be rejected");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_UNSAFE" }),
    );
  });

  it("rejects symlink escapes from tool-owned roots", async () => {
    const root = await tempRoot();
    const configRoot = path.join(root, "config");
    const dataRoot = path.join(root, "data");
    const stateRoot = path.join(root, "state");
    const logRoot = path.join(root, "log");
    const outsideRoot = path.join(root, "outside");
    await Promise.all([
      mkdir(configRoot, { recursive: true }),
      mkdir(dataRoot, { recursive: true }),
      mkdir(stateRoot, { recursive: true }),
      mkdir(logRoot, { recursive: true }),
      mkdir(outsideRoot, { recursive: true }),
    ]);
    const outsideFile = path.join(outsideRoot, "review.md");
    await writeFile(outsideFile, "outside");
    await symlink(outsideRoot, path.join(configRoot, "linked"));

    const resolver = createPathResolver({ configRoot, dataRoot, stateRoot, logRoot });
    const result = await resolveToolOwnedPath(resolver, "config", "linked/review.md");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected symlink escape to be rejected");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_UNSAFE" }),
    );
  });

  it("requires project source paths to be accessible absolute paths without traversal", async () => {
    const root = await tempRoot();
    const projectRoot = path.join(root, "project");
    await mkdir(projectRoot, { recursive: true });

    const resolved = await resolveProjectLocalPath(projectRoot);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error("expected project path to resolve");
    expect(resolved.value).toBe(await realpath(projectRoot));

    const relative = await resolveProjectLocalPath("project");
    expect(relative.ok).toBe(false);
    if (relative.ok) throw new Error("expected relative project path to fail");
    expect(relative.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_NOT_ABSOLUTE" }),
    );

    const traversing = await resolveProjectLocalPath(`${projectRoot}${path.sep}..`);
    expect(traversing.ok).toBe(false);
    if (traversing.ok) throw new Error("expected traversing project path to fail");
    expect(traversing.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_UNSAFE" }),
    );

    const missing = await resolveProjectLocalPath(path.join(root, "missing"));
    expect(missing.ok).toBe(false);
    if (missing.ok) throw new Error("expected missing project path to fail");
    expect(missing.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_NOT_FOUND" }),
    );
  });
});
