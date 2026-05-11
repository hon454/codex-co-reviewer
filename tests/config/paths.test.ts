import { constants } from "node:fs";
import { mkdtemp, mkdir, realpath, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPathResolver,
  resolveProjectLocalPath,
  resolveToolOwnedPath,
} from "../../src/config/paths.js";

type Access = typeof import("node:fs/promises").access;

const fsPromisesMocks = vi.hoisted(() => ({
  access: vi.fn<Access>(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    access: fsPromisesMocks.access,
  };
});

beforeEach(async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>(
    "node:fs/promises",
  );
  fsPromisesMocks.access.mockReset();
  fsPromisesMocks.access.mockImplementation(actual.access);
});

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

  it("rejects tool-owned traversal even when it normalizes within the selected root", async () => {
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
    await writeFile(
      path.join(configRoot, "profiles", "alpha", "review.md"),
      "review guidance",
    );

    const resolver = createPathResolver({ configRoot, dataRoot, stateRoot, logRoot });
    const result = await resolveToolOwnedPath(
      resolver,
      "config",
      "profiles/alpha/../alpha/review.md",
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected in-root traversal to be rejected");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_UNSAFE" }),
    );
  });

  it("rejects absolute tool-owned paths even when inside the selected root", async () => {
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
    const result = await resolveToolOwnedPath(resolver, "config", promptPath);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected absolute tool-owned path to be rejected");
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
    const canonicalProjectRoot = await realpath(projectRoot);

    const resolved = await resolveProjectLocalPath(canonicalProjectRoot);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) throw new Error("expected project path to resolve");
    expect(resolved.value).toBe(canonicalProjectRoot);

    const relative = await resolveProjectLocalPath("project");
    expect(relative.ok).toBe(false);
    if (relative.ok) throw new Error("expected relative project path to fail");
    expect(relative.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_NOT_ABSOLUTE" }),
    );

    const traversing = await resolveProjectLocalPath(
      `${canonicalProjectRoot}${path.sep}..`,
    );
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

  it("rejects configured project source paths that resolve through symlinks", async () => {
    const root = await tempRoot();
    const projectRoot = path.join(root, "project");
    const linkedProjectRoot = path.join(root, "project-link");
    await mkdir(projectRoot, { recursive: true });
    await symlink(projectRoot, linkedProjectRoot);

    const result = await resolveProjectLocalPath(linkedProjectRoot);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected project symlink path to fail");
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "CONFIG_PATH_UNSAFE" }),
    );
  });
});

describe("config path access modes", () => {
  it("checks tool-owned paths with read access only", async () => {
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
    const canonicalPromptPath = await realpath(promptPath);

    const resolver = createPathResolver({ configRoot, dataRoot, stateRoot, logRoot });
    const result = await resolveToolOwnedPath(
      resolver,
      "config",
      "profiles/alpha/review.md",
    );

    expect(result.ok).toBe(true);
    expect(fsPromisesMocks.access).toHaveBeenCalledTimes(1);
    expect(fsPromisesMocks.access).toHaveBeenCalledWith(
      canonicalPromptPath,
      constants.R_OK,
    );
  });

  it("checks project roots with read and execute access", async () => {
    const root = await tempRoot();
    const projectRoot = path.join(root, "project");
    await mkdir(projectRoot, { recursive: true });
    const canonicalProjectRoot = await realpath(projectRoot);

    const result = await resolveProjectLocalPath(canonicalProjectRoot);

    expect(result.ok).toBe(true);
    expect(fsPromisesMocks.access).toHaveBeenCalledTimes(1);
    expect(fsPromisesMocks.access).toHaveBeenCalledWith(
      canonicalProjectRoot,
      constants.R_OK | constants.X_OK,
    );
  });
});
