import type { FetchCtx } from "./types.js";

const API_BASE = "https://api.github.com";
const MAX_SLEEP_MS = 60_000;

export class GitHubError extends Error {
  readonly status: number;
  readonly rateLimitRemaining: number | null;
  readonly rateLimitReset: number | null;

  constructor(
    status: number,
    message: string,
    rateLimitRemaining: number | null,
    rateLimitReset: number | null,
  ) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.rateLimitRemaining = rateLimitRemaining;
    this.rateLimitReset = rateLimitReset;
  }
}

export class NotFoundError extends GitHubError {
  constructor(path: string) {
    super(404, `GitHub 404: ${path}`, null, null);
    this.name = "NotFoundError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(res: Response): number {
  const retryAfter = res.headers.get("retry-after");
  if (retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_SLEEP_MS);
    }
  }
  const reset = res.headers.get("x-ratelimit-reset");
  if (reset !== null) {
    const resetMs = Number(reset) * 1000 - Date.now();
    if (Number.isFinite(resetMs) && resetMs > 0) {
      return Math.min(resetMs, MAX_SLEEP_MS);
    }
  }
  return 1000;
}

function rateLimitHeaders(res: Response): {
  remaining: number | null;
  reset: number | null;
} {
  const remaining = res.headers.get("x-ratelimit-remaining");
  const reset = res.headers.get("x-ratelimit-reset");
  return {
    remaining: remaining === null ? null : Number(remaining),
    reset: reset === null ? null : Number(reset),
  };
}

export type GhGetOptions = { accept?: string };

export async function ghGet(
  path: string,
  ctx: FetchCtx,
  opts?: GhGetOptions,
): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "User-Agent": "ossfit",
    Accept: opts?.accept ?? "application/vnd.github+json",
  };
  if (ctx.token !== undefined && ctx.token !== "") {
    headers.Authorization = `Bearer ${ctx.token}`;
  }

  let res = await fetch(url, { headers });
  if (res.status === 403 || res.status === 429) {
    const delay = retryDelayMs(res);
    await res.body?.cancel().catch(() => undefined);
    await sleep(delay);
    res = await fetch(url, { headers });
  }

  if (res.status === 404) {
    await res.body?.cancel().catch(() => undefined);
    throw new NotFoundError(path);
  }
  if (!res.ok) {
    const { remaining, reset } = rateLimitHeaders(res);
    const resetAt =
      reset === null ? "unknown" : new Date(reset * 1000).toISOString();
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 300);
    } catch {
      detail = "";
    }
    throw new GitHubError(
      res.status,
      `GitHub ${res.status} for ${path} (rate-limit remaining: ${remaining ?? "unknown"}, reset: ${resetAt})${detail ? ` — ${detail}` : ""}`,
      remaining,
      reset,
    );
  }
  return res;
}

export async function ghGetJson<T>(path: string, ctx: FetchCtx): Promise<T> {
  const res = await ghGet(path, ctx);
  return (await res.json()) as T;
}
