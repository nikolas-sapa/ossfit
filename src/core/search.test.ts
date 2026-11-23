import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openCache } from "./cache.js";
import { searchCandidates } from "./search.js";
import type { Cache, RawRepo, RepoSignals } from "./types.js";

const SIGNALS: RepoSignals = {
  stars: 420,
  forks: 12,
  openIssues: 3,
  pushedDaysAgo: 10,
  createdAt: "2023-01-01T00:00:00Z",
  license: "MIT",
  contributors: 4,
  lastRelease: "2026-09-01T00:00:00Z",
  archived: false,
  isFork: false,
  topics: ["postgres", "pool"],
  language: "TypeScript",
  description: "Postgres connection pool for Node",
};

function repo(fullName: string, signals: Partial<RepoSignals> = {}): RawRepo {
  return {
    fullName,
    url: `https://github.com/${fullName}`,
    signals: { ...SIGNALS, ...signals },
    readmeText: `# ${fullName}\n\nA postgres connection pool.`,
  };
}

describe("searchCandidates --cached (offline)", () => {
  let dbPath: string;
  let cache: Cache;

  beforeEach(() => {
    dbPath = join(mkdtempSync(join(tmpdir(), "ossfit-test-")), "ossfit.db");
    cache = openCache(dbPath);
  });

  afterEach(() => {
    cache.close();
  });

  it("matches --license case-insensitively against SPDX ids", async () => {
    cache.putRepo(repo("acme/pg-pool", { license: "MIT" }));
    cache.putRepo(repo("acme/pg-pool-apache", { license: "Apache-2.0" }));
    const results = await searchCandidates(
      "postgres pool",
      { cachedOnly: true, license: "mit" },
      { cache },
    );
    expect(results.map((r) => r.fullName)).toEqual(["acme/pg-pool"]);
  });

  it("returns cached repos older than the 24h freshness window", async () => {
    cache.putRepo(repo("acme/pg-pool"));
    const raw = new Database(dbPath);
    raw
      .prepare("UPDATE repos SET fetched_at = ?")
      .run(Date.now() - 30 * 86_400_000);
    raw.close();

    expect(cache.getRepo("acme/pg-pool")).toBeNull();
    const results = await searchCandidates(
      "postgres pool",
      { cachedOnly: true },
      { cache },
    );
    expect(results.map((r) => r.fullName)).toEqual(["acme/pg-pool"]);
  });
});
