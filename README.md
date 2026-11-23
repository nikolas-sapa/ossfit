# ossfit

Better GitHub discovery — find repos that solve your problem, ranked by whether they'll actually work for you. Not by who has the most stars.

GitHub search answers *"what matches these keywords."* ossfit answers:

- which of these 40 lookalike repos fits my stack/problem?
- is this repo alive, maintained, documented — or a star-burnished husk?
- what underrated repos would I never see past page 1?

One npm package, three interfaces over a shared scoring engine: **CLI**, **self-hosted web UI**, and **MCP server** for AI agents. Zero backend, zero cost — SQLite cache, local embeddings, GitHub API.

## Install

```sh
git clone https://github.com/nikolas-sapa/ossfit && cd ossfit
npm install && npm run build && npm link   # `ossfit` on your PATH
# or without linking:
npx tsx src/cli/index.ts --help
```

Optional but recommended — a token lifts you from 60 to 5000 req/h:

```sh
export GH_TOKEN=...        # or GITHUB_TOKEN, or {"token": "..."} in ~/.ossfit/config.json
```

## Commands

```sh
ossfit search "rate limiter for hono edge"     # ranked results + verdicts + hidden gems
ossfit search "postgres pool" -n 10 --language typescript --min-stars 50
ossfit search "postgres pool" --pushed-within 90 --license mit --cached  # offline
ossfit eval fastify/fastify                    # deep single-repo verdict
ossfit compare expressjs/express fastify/fastify honojs/hono
ossfit serve                                   # web UI → http://localhost:4300
ossfit mcp                                     # stdio MCP server for agents
```

Every command accepts `--json` for the raw `RepoResult` shape.

## Scoring

Per repo, three scores plus a verdict and risk flags:

- **fit** (0–1) — 0.5 × semantic similarity (local MiniLM embeddings over the README) + 0.3 × BM25 + 0.2 × metadata match (language/topics/description)
- **health** (0–1) — push recency, release cadence, contributor breadth, docs; archived repos crater
- **gem** — `(fit × health) / log10(stars + 10)` — quality-per-star; surfaces underrated repos into a "hidden gems" bucket

Verdicts are deterministic text from the signals ("strong fit — active, documented", "topical match but maintenance risk") with risk flags: `archived`, `stale-commits-365d+`, `no-releases`, `single-maintainer`, `no-license`, `fork`, `no-readme`, `low-docs`.

## MCP server

Exposes `search_repositories`, `evaluate_repository`, `compare_repositories` over stdio. Claude Code / Codex config:

```json
{
  "mcpServers": {
    "ossfit": { "command": "ossfit", "args": ["mcp"] }
  }
}
```

## Web UI

`ossfit serve` → `http://localhost:4300`. Dark dev-tool UI: search + filters, ranked verdict cards, hidden-gems section, compare view. Self-contained (no CDN, no build step), binds 127.0.0.1.

## How it works

```
query → 3 GitHub search strategies (relevance / in:readme / recently-updated)
      → dedupe + fetch metadata & README per candidate (~5 API calls each)
      → local MiniLM embedding vs query + FTS5 BM25 + signal extraction
      → fit / health / gem scores → verdict → ranked results
```

Repos, READMEs, and embeddings cache in `~/.ossfit/ossfit.db` — repeat queries cost ~0 API calls and work offline via `--cached`.

## Stack

TypeScript (ESM, Node 20+) · better-sqlite3 (cache + FTS5) · @huggingface/transformers (local embeddings, no API key) · commander (CLI) · hono (web) · @modelcontextprotocol/sdk (MCP). No LLM calls required.

## License

MIT
