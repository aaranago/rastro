import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Expo Router file boundary", () => {
  it("keeps test files outside the native route tree", () => {
    const appDirectory = fileURLToPath(
      new URL("../../app", import.meta.url).href,
    );

    expect(findRouteTreeTestFiles(appDirectory)).toEqual([]);
  });
});

function findRouteTreeTestFiles(appDirectory: string): string[] {
  return collectFiles(appDirectory)
    .filter((filePath) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(filePath))
    .map((filePath) => relative(appDirectory, filePath))
    .sort();
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    return stats.isDirectory() ? collectFiles(entryPath) : [entryPath];
  });
}
