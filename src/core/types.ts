// THE CONTRACT — shared types only. Implementations live in sibling files:
//   github.ts  low-level GitHub REST client (auth, retry, rate-limit handling)
//   search.ts  export async function searchCandidates(query, opts, ctx): Promise<RawRepo[]>
//   fetch.ts   export async function fetchRepo(fullName, ctx): Promise<RawRepo>
//              export async function fetchReadme(fullName, ctx): Promise<string | null>
//   cache.ts   export function openCache(dbPath): Cache
//   embed.ts   export async function embedText(text): Promise<number[]>
//              export async function embedBatch(texts): Promise<number[][]>
//   score.ts   export function scoreRepo(input: ScoreInput): Scores
//   verdict.ts export function makeVerdict(input: { scores, signals, readmeText }):
//              { verdict: string; riskFlags: string[]; readmeSummary: string }
//   core.ts    export function createCore(config: CoreConfig): Core
// Import types from "./types.js"; import impls from their real files.

export type RepoSignals = {
  stars: number;
  forks: number;
  openIssues: number;
  pushedDaysAgo: number | null;
  createdAt: string | null;
  license: string | null;
  contributors: number | null;
  lastRelease: string | null; // ISO date or null
  archived: boolean;
  isFork: boolean;
  topics: string[];
  language: string | null;
  description: string | null;
};

export type Scores = {
  fit: number; // 0..1 relevance to query
  health: number; // 0..1 maintenance liveness
  gem: number; // >=0, higher = more underrated
};

export type RepoResult = {
  repo: string; // "owner/name"
  url: string;
  fitScore: number;
  healthScore: number;
  gemScore: number;
  verdict: string;
  riskFlags: string[];
  readmeSummary: string;
  signals: RepoSignals;
};

export type SearchOptions = {
  limit?: number; // default 20
  language?: string;
  minStars?: number;
  maxStars?: number;
  pushedWithinDays?: number;
  license?: string;
  excludeForks?: boolean; // default true
  excludeArchived?: boolean; // default true
  cachedOnly?: boolean; // offline mode, default false
  token?: string; // overrides config/env token
};

export type CoreConfig = {
  token?: string; // falls back to GH_TOKEN / GITHUB_TOKEN env, then ~/.ossfit/config.json
  dbPath?: string; // default ~/.ossfit/ossfit.db
  llm?: { apiKey: string; model?: string }; // optional verdict rewriting, off by default
};

export interface Core {
  search(query: string, opts?: SearchOptions): Promise<RepoResult[]>;
  evaluate(fullName: string, opts?: { token?: string }): Promise<RepoResult>;
  compare(fullNames: string[], opts?: { token?: string }): Promise<RepoResult[]>;
}

export type RawRepo = {
  fullName: string;
  url: string;
  signals: RepoSignals;
  readmeText: string | null;
};

export type FetchCtx = { token?: string; cache: Cache };

export interface Cache {
  getRepo(fullName: string): RawRepo | null;
  putRepo(repo: RawRepo): void;
  getEmbedding(key: string): number[] | null;
  putEmbedding(key: string, vec: number[]): void;
  bm25(query: string, fullName: string): number; // 0..1
  searchCached(query: string): string[]; // FTS-ranked full_names, offline
  close(): void;
}

export type ScoreInput = {
  queryVec: number[] | null;
  readmeVec: number[] | null;
  bm25: number;
  signals: RepoSignals;
};
