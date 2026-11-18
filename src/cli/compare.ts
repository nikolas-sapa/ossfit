import type { Command } from "commander";
import { createCore } from "../core/core.js";
import type { RepoResult } from "../core/types.js";

const FULL_NAME_RE = /^[^\s/]+\/[^\s/]+$/;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

function printCompare(results: RepoResult[]): void {
  const metrics: Array<{ label: string; value: (r: RepoResult) => string }> = [
    { label: "fit", value: (r) => r.fitScore.toFixed(2) },
    { label: "health", value: (r) => r.healthScore.toFixed(2) },
    { label: "gem", value: (r) => r.gemScore.toFixed(2) },
    { label: "stars", value: (r) => String(r.signals.stars) },
    { label: "forks", value: (r) => String(r.signals.forks) },
    { label: "open issues", value: (r) => String(r.signals.openIssues) },
    {
      label: "pushed",
      value: (r) =>
        r.signals.pushedDaysAgo === null
          ? "-"
          : `${r.signals.pushedDaysAgo}d ago`,
    },
    {
      label: "contributors",
      value: (r) => String(r.signals.contributors ?? "-"),
    },
    { label: "license", value: (r) => r.signals.license ?? "-" },
    { label: "last release", value: (r) => r.signals.lastRelease ?? "-" },
    { label: "language", value: (r) => r.signals.language ?? "-" },
    { label: "archived", value: (r) => String(r.signals.archived) },
    { label: "verdict", value: (r) => truncate(r.verdict, 40) },
  ];

  const repoWidth = Math.max(...results.map((r) => r.repo.length), 10);
  const labelWidth = Math.max(...metrics.map((m) => m.label.length));
  const header = `${"".padEnd(labelWidth)}  ${results
    .map((r) => r.repo.padEnd(repoWidth))
    .join("  ")}`;
  console.log(header);
  console.log(
    `${"-".repeat(labelWidth)}  ${results.map(() => "-".repeat(repoWidth)).join("  ")}`,
  );
  for (const metric of metrics) {
    console.log(
      `${metric.label.padEnd(labelWidth)}  ${results
        .map((r) => metric.value(r).padEnd(repoWidth))
        .join("  ")}`,
    );
  }
}

export function registerCompare(program: Command): void {
  program
    .command("compare")
    .description("Side-by-side comparison of GitHub repos")
    .argument("<repos...>", "two or more owner/name repos")
    .option("--json", "print raw RepoResult[] JSON")
    .action(async (repos: string[], opts: { json?: boolean }) => {
      try {
        if (repos.length < 2) {
          throw new Error("compare needs at least two repos");
        }
        for (const repo of repos) {
          if (!FULL_NAME_RE.test(repo)) {
            throw new Error(`expected owner/name, got "${repo}"`);
          }
        }
        const core = createCore({});
        const results = await core.compare(repos);
        if (opts.json === true) {
          console.log(JSON.stringify(results, null, 2));
          return;
        }
        printCompare(results);
      } catch (err) {
        process.stderr.write(
          `ossfit: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(1);
      }
    });
}
