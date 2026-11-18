import { ghGet, ghGetJson, NotFoundError } from "./github.js";
import type { FetchCtx, RawRepo, RepoSignals } from "./types.js";

type GhRepo = {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  created_at: string | null;
  license: { spdx_id: string } | null;
  archived: boolean;
  fork: boolean;
  topics?: string[];
  language: string | null;
};

type GhRelease = {
  published_at: string | null;
  created_at: string | null;
};

function daysAgo(iso: string | null): number | null {
  if (iso === null) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function contributorCount(linkHeader: string | null): number | null {
  if (linkHeader === null) return null;
  const last = linkHeader
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.includes('rel="last"'));
  if (last === undefined) return null;
  const match = /<[^>]*[?&]page=(\d+)[^>]*>/.exec(last);
  if (match === null) return null;
  const count = Number(match[1]);
  return Number.isFinite(count) ? count : null;
}

export async function fetchRepo(
  fullName: string,
  ctx: FetchCtx,
): Promise<RawRepo> {
  const cached = ctx.cache.getRepo(fullName);
  if (cached !== null) return cached;

  const repo = await ghGetJson<GhRepo>(`/repos/${fullName}`, ctx);

  let lastRelease: string | null = null;
  try {
    const release = await ghGetJson<GhRelease>(
      `/repos/${fullName}/releases/latest`,
      ctx,
    );
    lastRelease = release.published_at ?? release.created_at;
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  let contributors: number | null = null;
  try {
    const res = await ghGet(
      `/repos/${fullName}/contributors?per_page=1&anon=true`,
      ctx,
    );
    const link = res.headers.get("link");
    if (link !== null) {
      contributors = contributorCount(link);
      await res.body?.cancel().catch(() => undefined);
    } else if (res.status === 204) {
      contributors = 0;
    } else {
      const list = (await res.json()) as unknown[];
      contributors = Array.isArray(list) ? list.length : null;
    }
  } catch (err) {
    if (!(err instanceof NotFoundError)) throw err;
  }

  const signals: RepoSignals = {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    pushedDaysAgo: daysAgo(repo.pushed_at),
    createdAt: repo.created_at,
    license: repo.license?.spdx_id ?? null,
    contributors,
    lastRelease,
    archived: repo.archived,
    isFork: repo.fork,
    topics: repo.topics ?? [],
    language: repo.language,
    description: repo.description,
  };

  const readmeText = await fetchReadme(fullName, ctx);

  const raw: RawRepo = {
    fullName: repo.full_name,
    url: repo.html_url,
    signals,
    readmeText,
  };
  ctx.cache.putRepo(raw);
  return raw;
}

export async function fetchReadme(
  fullName: string,
  ctx: FetchCtx,
): Promise<string | null> {
  const cached = ctx.cache.getRepo(fullName);
  if (cached !== null) return cached.readmeText;

  try {
    const res = await ghGet(`/repos/${fullName}/readme`, ctx, {
      accept: "application/vnd.github.raw",
    });
    const text = await res.text();
    return text === "" ? null : text;
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}
