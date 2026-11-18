import { describe, expect, it } from "vitest";
import { scoreRepo } from "./score.js";
import type { RepoSignals, ScoreInput } from "./types.js";

const HEALTHY_SIGNALS: RepoSignals = {
  stars: 1200,
  forks: 80,
  openIssues: 12,
  pushedDaysAgo: 3,
  createdAt: "2022-01-01T00:00:00Z",
  license: "MIT",
  contributors: 14,
  lastRelease: "2026-10-01T00:00:00Z",
  archived: false,
  isFork: false,
  topics: ["rate-limiter", "hono"],
  language: "TypeScript",
  description: "Rate limiter middleware for Hono on edge runtimes",
};

function makeInput(
  overrides: Partial<ScoreInput> = {},
  signals: Partial<RepoSignals> = {},
): ScoreInput {
  return {
    queryVec: [0.2, 0.5, 0.3, 0.1],
    readmeVec: [0.2, 0.5, 0.3, 0.1],
    bm25: 0,
    signals: { ...HEALTHY_SIGNALS, ...signals },
    ...overrides,
  };
}

describe("scoreRepo fit", () => {
  it("is 0 when both vectors are null", () => {
    const scores = scoreRepo(makeInput({ queryVec: null, readmeVec: null }));
    expect(scores.fit).toBe(0);
  });

  it("is 0 when only one vector is null and bm25 is 0", () => {
    const scores = scoreRepo(makeInput({ readmeVec: null }));
    expect(scores.fit).toBe(0);
  });

  it("gives 0.5 cosine contribution for identical vectors", () => {
    const scores = scoreRepo(makeInput());
    expect(scores.fit).toBeCloseTo(0.5, 6);
  });

  it("guards zero-norm vectors", () => {
    const scores = scoreRepo(makeInput({ readmeVec: [0, 0, 0, 0] }));
    expect(scores.fit).toBe(0);
  });

  it("adds partial metaMatch credit for query tokens", () => {
    const scores = scoreRepo(
      makeInput({ queryVec: null, readmeVec: null, bm25: 0 }),
      { query: "rate limiter redis" }, // rate + limiter match, redis does not → 2/3
    );
    expect(scores.fit).toBeCloseTo(0.2 * (2 / 3), 6);
  });
});

describe("scoreRepo health", () => {
  it("drops below 0.15 for archived repos", () => {
    const scores = scoreRepo(makeInput({}, { archived: true }));
    expect(scores.health).toBeLessThan(0.15);
  });

  it("scores a recently pushed repo healthier than a stale one", () => {
    const fresh = scoreRepo(makeInput({}, { pushedDaysAgo: 10 }));
    const stale = scoreRepo(makeInput({}, { pushedDaysAgo: 400 }));
    expect(fresh.health).toBeGreaterThan(stale.health);
  });
});

describe("scoreRepo gem", () => {
  it("ranks a 50-star repo above a 50000-star repo at equal fit and health", () => {
    const lowStar = scoreRepo(makeInput({}, { stars: 50 }));
    const highStar = scoreRepo(makeInput({}, { stars: 50000 }));
    expect(lowStar.gem).toBeGreaterThan(highStar.gem);
  });
});
