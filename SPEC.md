# ossfit — Spec (working name)

> Better GitHub discovery: find repos that solve your problem, ranked by whether
> they'll actually work for you — not by who has the most stars.

Status: DRAFT v0.1 · 2026-11-18
Name: `ossfit` is a placeholder. Alternates: repofit, ghlens, oss-radar, repoverdict.
Decide at repo creation (get a decent .com/.dev or don't agonize — name barely matters).

---

## 1. Problem

GitHub search answers "what matches these keywords." It does not answer:

- "Which of these 40 lookalike repos actually fits my stack/problem?"
- "Is this repo alive, maintained, documented — or a star-burnished husk?"
- "Are there underrated repos I'd never see past page 1?"

Existing tools (GitDeepSearch, RepoRadar, GitFindr, gix01, RepoScout) wrap the
search API or index READMEs, but none ships a strong **evaluation verdict**,
none is **agent-consumable (MCP)**, and the semantic ones require heavy infra
or are slow (RepoRadar ~60-70s/query).

## 2. Users

- Devs picking a library/tool for a project ("find me X for my stack")
- OSS explorers hunting projects to contribute to or learn from
- AI coding agents picking dependencies programmatically (MCP)

## 3. Product

One npm package, three interfaces over a shared core engine:

```
ossfit search "rate limiter for hono edge"   → ranked list + verdicts
ossfit eval owner/repo                        → deep single-repo verdict
ossfit compare owner/a owner/b [...]          → side-by-side table
ossfit serve                                  → self-hosted web UI (localhost:4300)
ossfit mcp                                    → stdio MCP server for agents
```

### Output contract (every interface returns the same shape)

Per repo:

```jsonc
{
  "repo": "owner/name",
  "url": "...",
  "fitScore": 0.0,        // relevance to the query
  "healthScore": 0.0,     // maintenance liveness
  "gemScore": 0.0,        // quality-per-star (underrated detector)
  "verdict": "strong fit — active, well-documented, low bus-factor risk",
  "riskFlags": ["stale-commits-18mo", "single-maintainer"],
  "readmeSummary": "...",  // extractive (local) or LLM (optional)
  "signals": { "stars": 0, "pushedDaysAgo": 0, "license": "", "contributors": 0, "lastRelease": "" }
}
```

## 4. Scoring model

- **FitScore** = 0.5 × cosine(query-embedding, readme-embedding) + 0.3 × BM25(FTS5) + 0.2 × metadata match (topics, language, description)
- **HealthScore** = recency(push) + recency(last release) + issue/PR responsiveness proxy + contributor count + penalty(archived/disabled)
- **GemScore** = (FitScore × HealthScore) / log10(stars + 10) — surfaces high-quality low-star repos into a "hidden gems" bucket
- **Verdict** = deterministic template from signals by default; optional LLM rewrite (user-supplied key, off by default)

## 5. Architecture

Single TypeScript npm package (`npx ossfit`). No infra beyond a SQLite file.

```
src/
  core/        # engine — the product
    search.ts      # GitHub Search API strategies (relevance, stars, updated, in:readme)
    fetch.ts       # repo metadata + README (raw via accept: application/vnd.github.raw)
    score.ts       # fit/health/gem scoring
    verdict.ts     # signal → verdict text (+ optional LLM hook)
    cache.ts       # SQLite: repo metadata, README text, embeddings, query cache
    embed.ts       # transformers.js all-MiniLM-L6-v2 (local, 384-dim, $0)
  cli/         # commander entrypoints (search/eval/compare/serve/mcp)
  web/         # self-hosted UI: Hono server + React (or Next.js-lite), served by `ossfit serve`
  mcp/         # @modelcontextprotocol/sdk stdio server
    tools: search_repositories, evaluate_repository, compare_repositories
index.ts       # lib exports for programmatic use
```

**Storage:** `~/.ossfit/ossfit.db` — SQLite + FTS5 (BM25 keyword) + embedding
column (cosine in JS, or sqlite-vec later). Zero external services.

**GitHub API budget:**
- Search: 30 req/min authenticated (10 unauth) — run 3-4 strategies per query
- Per-repo eval: ~4-6 core calls (repo, readme, releases, contributors, issues)
- Core limit: 5000 req/h with PAT → ~800 repo evals/hour, cached forever
- Token optional in config; graceful degradation at 60 req/h without

**Caching:** repo metadata + README cached 24h (stars refresh) / embeddings
permanent (README hash-keyed). Second run of same query = ~0 API calls.

## 6. Cost model (self-hosted)

| Item | Cost |
|---|---|
| GitHub API (PAT, free tier) | $0 |
| Embeddings (transformers.js, local) | $0 |
| Storage (SQLite file) | $0 |
| Hosting (your machine / existing box) | $0 |
| Optional: VPS to expose web UI publicly | ~$5/mo (only if wanted) |
| Optional: LLM verdict rewriting | user's own key, off by default |

## 7. Non-goals (v1)

- Code search (grep.app/Sourcegraph own this; different product)
- GitLab/Bitbucket (RepoScout lane; GitHub first)
- User/people search (GitDeepSearch lane)
- Cloud-hosted SaaS, accounts, sync, telemetry
- Paid features, rate-limiting other users, API keys we manage
- Mobile anything

## 8. Test plan (before impl)

| # | Test | Pass criteria |
|---|---|---|
| T1 | Cold query "postgres connection pool" returns ranked results | <30s cold, ≥20 repos, top-10 all topically related (manual check) |
| T2 | Warm repeat of same query | <2s, 0 GitHub API calls (all cache hits) |
| T3 | `eval` on archived repo | verdict contains "archived" risk flag, healthScore < 0.3 |
| T4 | Hidden-gem surfacing | query where a <500-star repo outranks a 10k-star repo on fit+health — appears in "gems" bucket |
| T5 | MCP round-trip | `search_repositories` callable from an MCP client, returns contract JSON, <30s |
| T6 | Rate-limit resilience | run without token → degrades gracefully, never crashes, clear "add token" message |
| T7 | Offline mode | `ossfit search --cached` works with no network against cache |
| T8 | Determinism | same query + same cache → identical ordering, twice |

## 9. Implementation plan

- **P0 — core engine:** GitHub client (auth+retry), 4 search strategies, repo fetcher, SQLite cache. CLI `search`/`eval` wired. (Proves the API budget works.)
- **P1 — scoring:** embeddings + FTS5 + health signals + verdicts + gems bucket. T1-T4 green.
- **P2 — MCP server:** 3 tools over core. T5. (Agents become users.)
- **P3 — web UI:** `ossfit serve`, search page + verdict cards + compare view.
- **P4 — polish/release:** README with demo GIF, npm publish, repo topics, LICENSE (MIT), CONTRIBUTING.

## 10. Open questions

1. Web UI stack — Hono+React in-package (lean) vs Next.js (heavier, you know it). Spec leans Hono: `ossfit serve` should stay one dependency-light command.
2. Embeddings model pinned at MiniLM-L6-v2 — swap for a code-aware model later if fit quality is weak (T1/T4 are the gates).
3. Name + repo destination on your GitHub.
