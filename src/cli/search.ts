import type { Command } from "commander";
import { createCore } from "../core/core.js";
import type { RepoResult } from "../core/types.js";

type SearchOpts = {
  limit?: string;
  language?: string;
  minStars?: string;
  maxStars?: string;
  pushedWithin?: string;
  license?: string;
  includeForks?: boolean;
  includeArchived?: boolean;
  cached?: boolean;
  json?: boolean;
};

function parseNum(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    process.stderr.write(`ossfit: invalid value for ${flag}: ${value}\n`);
    process.exit(1);
  }
  return n;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function fmtPushed(days: number | null): string {
  return days === null ? "-" : `${days}d ago`;
}

function printTable(results: RepoResult[]): void {
  const rows = results.map((r) => [
    r.repo,
    r.fitScore.toFixed(2),
    r.healthScore.toFixed(2),
    String(r.signals.stars),
    fmtPushed(r.signals.pushedDaysAgo),
    truncate(r.verdict, 60),
  ]);
  const header = ["repo", "fit", "health", "stars", "pushed", "verdict"];
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );
  const line = (cells: string[]): string =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  ").trimEnd();
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) console.log(line(row));
}

function printGems(results: RepoResult[]): void {
  const gems = results
    .filter((r) => r.signals.stars < 1000)
    .sort((a, b) => b.gemScore - a.gemScore)
    .slice(0, 3);
  if (gems.length === 0) return;
  console.log("\nHidden gems (quality-per-star):");
  for (const g of gems) {
    console.log(
      `  ${g.repo}  gem=${g.gemScore.toFixed(2)}  stars=${g.signals.stars}  ${truncate(g.verdict, 60)}`,
    );
  }
}

export function registerSearch(program: Command): void {
  program
    .command("search")
    .description("Search GitHub repos ranked by fit, health, and gem potential")
    .argument("<query>", "search query")
    .option("-n, --limit <n>", "max candidates to evaluate", "20")
    .option("--language <lang>", "filter by language")
    .option("--min-stars <n>", "minimum stars")
    .option("--max-stars <n>", "maximum stars")
    .option("--pushed-within <days>", "only repos pushed within N days")
    .option("--license <license>", "filter by license SPDX id")
    .option("--include-forks", "include forked repos")
    .option("--include-archived", "include archived repos")
    .option("--cached", "offline mode: only previously cached results")
    .option("--json", "print raw RepoResult[] JSON")
    .action(async (query: string, opts: SearchOpts) => {
      try {
        const core = createCore({});
        const results = await core.search(query, {
          limit: parseNum(opts.limit, "--limit") ?? 20,
          language: opts.language,
          minStars: parseNum(opts.minStars, "--min-stars"),
          maxStars: parseNum(opts.maxStars, "--max-stars"),
          pushedWithinDays: parseNum(
            opts.pushedWithin,
            "--pushed-within",
          ),
          license: opts.license,
          excludeForks: opts.includeForks === true ? false : true,
          excludeArchived: opts.includeArchived === true ? false : true,
          cachedOnly: opts.cached === true,
        });
        if (opts.json === true) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }
        if (results.length === 0) {
          console.log("No results.");
          return;
        }
        printTable(results);
        printGems(results);
      } catch (err) {
        process.stderr.write(
          `ossfit: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(1);
      }
    });
}
