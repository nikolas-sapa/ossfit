import type { RepoSignals, ScoreInput, Scores } from "./types.js";

const FIT_W_COSINE = 0.5;
const FIT_W_BM25 = 0.3;
const FIT_W_META = 0.2;

const HEALTH_W_RECENCY = 0.35;
const HEALTH_W_RELEASE = 0.25;
const HEALTH_W_CONTRIBUTORS = 0.2;
const HEALTH_W_DOCS = 0.2;
const ARCHIVED_HEALTH_FACTOR = 0.1;

const DAY_MS = 86_400_000;

// ScoreInput carries no query string, so metaMatch needs the query passed here.
// Optional: callers without it still get cosine + bm25 (metaMatch degrades to 0).
export type ScoreOptions = {
  query?: string;
  now?: Date; // injected for deterministic release-recency scoring
};

// SPEC §4: fit = 0.5*cosine + 0.3*bm25 + 0.2*metaMatch; health = weighted
// maintenance signals (×0.1 when archived); gem = (fit*health)/log10(stars+10).
export function scoreRepo(input: ScoreInput, opts: ScoreOptions = {}): Scores {
  const { signals } = input;
  const now = opts.now ?? new Date();

  const cosineScore =
    input.queryVec !== null && input.readmeVec !== null
      ? cosine(input.queryVec, input.readmeVec)
      : 0;
  const bm25Score = clamp01(input.bm25);
  const metaScore = opts.query !== undefined ? metaMatch(opts.query, signals) : 0;
  const fit = clamp01(
    FIT_W_COSINE * cosineScore + FIT_W_BM25 * bm25Score + FIT_W_META * metaScore,
  );

  let health =
    HEALTH_W_RECENCY * recencyScore(signals.pushedDaysAgo) +
    HEALTH_W_RELEASE * releaseScore(signals.lastRelease, now) +
    HEALTH_W_CONTRIBUTORS * contributorScore(signals.contributors) +
    HEALTH_W_DOCS * docsScore(signals);
  if (signals.archived) health *= ARCHIVED_HEALTH_FACTOR;
  health = clamp01(health);

  const gem = (fit * health) / Math.log10(signals.stars + 10);

  return { fit, health, gem };
}

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function metaMatch(query: string, signals: RepoSignals): number {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const haystack = [
    signals.language ?? "",
    signals.description ?? "",
    ...signals.topics,
  ]
    .join(" ")
    .toLowerCase();
  const matched = tokens.filter((token) => haystack.includes(token)).length;
  return Math.min(1, matched / tokens.length);
}

// Linear interpolation between the SPEC knots so each stated point holds
// exactly (0d→1.0, 30d→0.8, 90d→0.6, 180d→0.4, 365d→0.2), >365d→0.05, null→0.1.
const RECENCY_KNOTS: ReadonlyArray<readonly [number, number]> = [
  [0, 1.0],
  [30, 0.8],
  [90, 0.6],
  [180, 0.4],
  [365, 0.2],
];

function recencyScore(pushedDaysAgo: number | null): number {
  if (pushedDaysAgo === null) return 0.1;
  if (pushedDaysAgo > 365) return 0.05;
  if (pushedDaysAgo <= RECENCY_KNOTS[0][0]) return RECENCY_KNOTS[0][1];
  for (let i = 1; i < RECENCY_KNOTS.length; i++) {
    const [d1, v1] = RECENCY_KNOTS[i];
    if (pushedDaysAgo <= d1) {
      const [d0, v0] = RECENCY_KNOTS[i - 1];
      const t = (pushedDaysAgo - d0) / (d1 - d0);
      return v0 + t * (v1 - v0);
    }
  }
  return RECENCY_KNOTS[RECENCY_KNOTS.length - 1][1];
}

function releaseScore(lastRelease: string | null, now: Date): number {
  if (lastRelease === null) return 0.3;
  const releasedAt = Date.parse(lastRelease);
  if (Number.isNaN(releasedAt)) return 0.3;
  const daysAgo = (now.getTime() - releasedAt) / DAY_MS;
  if (daysAgo < 90) return 1;
  if (daysAgo < 365) return 0.6;
  return 0.2;
}

function contributorScore(contributors: number | null): number {
  if (contributors === null) return 0.4;
  if (contributors <= 1) return 0.3;
  if (contributors <= 5) return 0.6;
  if (contributors <= 20) return 0.8;
  return 1;
}

function docsScore(signals: RepoSignals): number {
  return (signals.description ? 0.6 : 0.2) + (signals.topics.length > 0 ? 0.4 : 0);
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
