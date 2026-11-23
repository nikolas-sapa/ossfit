import { fetchRepo } from "./fetch.js";
import { ghGetJson } from "./github.js";
import type { FetchCtx, RawRepo, SearchOptions } from "./types.js";

const PER_PAGE = 25;
const MAX_CONCURRENT_FETCHES = 5;

type GhSearchItem = { full_name: string };
type GhSearchResponse = { items: GhSearchItem[] };

function buildQualifiers(opts: SearchOptions): string {
  const parts: string[] = [];
  if (opts.language !== undefined) parts.push(`language:${opts.language}`);
  if (opts.minStars !== undefined || opts.maxStars !== undefined) {
    const min = opts.minStars ?? 0;
    const max = opts.maxStars !== undefined ? String(opts.maxStars) : "*";
    parts.push(`stars:${min}..${max}`);
  }
  if (opts.pushedWithinDays !== undefined) {
    const since = new Date(
      Date.now() - opts.pushedWithinDays * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    parts.push(`pushed:>${since}`);
  }
  if (opts.license !== undefined) parts.push(`license:${opts.license}`);
  if (opts.excludeForks !== false) parts.push("fork:false");
  if (opts.excludeArchived !== false) parts.push("archived:false");
  return parts.join(" ");
}

function matchesOptions(repo: RawRepo, opts: SearchOptions): boolean {
  const s = repo.signals;
  if (
    opts.language !== undefined &&
    s.language?.toLowerCase() !== opts.language.toLowerCase()
  )
    return false;
  if (opts.minStars !== undefined && s.stars < opts.minStars) return false;
  if (opts.maxStars !== undefined && s.stars > opts.maxStars) return false;
  if (
    opts.pushedWithinDays !== undefined &&
    (s.pushedDaysAgo === null || s.pushedDaysAgo > opts.pushedWithinDays)
  )
    return false;
  if (
    opts.license !== undefined &&
    s.license?.toLowerCase() !== opts.license.toLowerCase()
  )
    return false;
  if (opts.excludeForks !== false && s.isFork) return false;
  if (opts.excludeArchived !== false && s.archived) return false;
  return true;
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length) as R[];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function runStrategy(
  q: string,
  sort: string | null,
  ctx: FetchCtx,
): Promise<string[]> {
  const params = new URLSearchParams({ q, per_page: String(PER_PAGE) });
  if (sort !== null) params.set("sort", sort);
  const data = await ghGetJson<GhSearchResponse>(
    `/search/repositories?${params.toString()}`,
    ctx,
  );
  return data.items.map((item) => item.full_name);
}

export async function searchCandidates(
  query: string,
  opts: SearchOptions,
  ctx: FetchCtx,
): Promise<RawRepo[]> {
  const limit = opts.limit ?? 20;

  if (opts.cachedOnly === true) {
    const repos: RawRepo[] = [];
    for (const name of ctx.cache.searchCached(query)) {
      if (repos.length >= limit) break;
      const cached = ctx.cache.getRepo(name, { allowStale: true });
      if (cached !== null && matchesOptions(cached, opts)) repos.push(cached);
    }
    return repos;
  }

  const qualifiers = buildQualifiers(opts);
  const qualifiedQuery = qualifiers === "" ? query : `${query} ${qualifiers}`;

  const strategies: Array<{ q: string; sort: string | null }> = [
    { q: qualifiedQuery, sort: null },
    { q: `${qualifiedQuery} in:readme`, sort: null },
    { q: qualifiedQuery, sort: "updated" },
  ];

  const fullNames: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < strategies.length; i += 1) {
    if (fullNames.length >= limit) break;
    const strategy = strategies[i];
    try {
      const names = await runStrategy(strategy.q, strategy.sort, ctx);
      for (const name of names) {
        if (!seen.has(name)) {
          seen.add(name);
          fullNames.push(name);
        }
      }
    } catch (err) {
      if (i === 0) throw err;
      process.stderr.write(
        `ossfit: search strategy failed (${err instanceof Error ? err.message : String(err)}); continuing.\n`,
      );
    }
  }

  const capped = fullNames.slice(0, limit);
  const repos = await runPool(capped, MAX_CONCURRENT_FETCHES, (name) =>
    fetchRepo(name, ctx),
  );
  return repos;
}
