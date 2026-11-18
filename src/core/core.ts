import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { openCache } from "./cache.js";
import { embedText } from "./embed.js";
import { fetchRepo } from "./fetch.js";
import { scoreRepo } from "./score.js";
import { searchCandidates } from "./search.js";
import { makeVerdict } from "./verdict.js";
import type {
  Cache,
  Core,
  CoreConfig,
  FetchCtx,
  RawRepo,
  RepoResult,
  SearchOptions,
} from "./types.js";

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/") || path.startsWith("~\\")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

function fileToken(): string | undefined {
  try {
    const path = join(homedir(), ".ossfit", "config.json");
    if (!existsSync(path)) return undefined;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as {
      token?: unknown;
    };
    return typeof parsed.token === "string" ? parsed.token : undefined;
  } catch {
    return undefined;
  }
}

async function tryEmbed(text: string): Promise<number[] | null> {
  try {
    return await embedText(text);
  } catch {
    return null;
  }
}

async function toResult(
  raw: RawRepo,
  queryVec: number[] | null,
  bm25Score: number,
  query?: string,
): Promise<RepoResult> {
  const readmeVec = await tryEmbed(
    raw.readmeText ?? raw.signals.description ?? "",
  );
  const scores = scoreRepo(
    {
      queryVec,
      readmeVec,
      bm25: bm25Score,
      signals: raw.signals,
    },
    { query },
  );
  const { verdict, riskFlags, readmeSummary } = makeVerdict({
    scores,
    signals: raw.signals,
    readmeText: raw.readmeText,
    query,
  });
  return {
    repo: raw.fullName,
    url: raw.url,
    fitScore: scores.fit,
    healthScore: scores.health,
    gemScore: scores.gem,
    verdict,
    riskFlags,
    readmeSummary,
    signals: raw.signals,
  };
}

export function createCore(config: CoreConfig): Core {
  const token =
    config.token ??
    process.env.GH_TOKEN ??
    process.env.GITHUB_TOKEN ??
    fileToken();
  const dbPath = expandHome(config.dbPath ?? join(homedir(), ".ossfit", "ossfit.db"));
  const cache: Cache = openCache(dbPath);

  function ctxFor(tokenOverride?: string): FetchCtx {
    return { token: tokenOverride ?? token, cache };
  }

  async function evaluate(
    fullName: string,
    opts: { token?: string } = {},
  ): Promise<RepoResult> {
    const ctx = ctxFor(opts.token);
    const raw = await fetchRepo(fullName, ctx);
    return toResult(raw, null, 0);
  }

  return {
    async search(
      query: string,
      opts: SearchOptions = {},
    ): Promise<RepoResult[]> {
      const ctx = ctxFor(opts.token);
      const candidates = await searchCandidates(query, opts, ctx);
      const queryVec = await tryEmbed(query);
      const results = await Promise.all(
        candidates.map((raw) =>
          toResult(raw, queryVec, cache.bm25(query, raw.fullName), query),
        ),
      );
      results.sort((a, b) => {
        if (b.fitScore !== a.fitScore) return b.fitScore - a.fitScore;
        return b.healthScore - a.healthScore;
      });
      return results;
    },

    evaluate,

    async compare(
      fullNames: string[],
      opts: { token?: string } = {},
    ): Promise<RepoResult[]> {
      const results: RepoResult[] = [];
      for (const name of fullNames) {
        results.push(await evaluate(name, opts));
      }
      return results;
    },
  };
}
