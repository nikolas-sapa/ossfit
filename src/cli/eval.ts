import type { Command } from "commander";
import { createCore } from "../core/core.js";
import type { RepoResult } from "../core/types.js";

const FULL_NAME_RE = /^[^\s/]+\/[^\s/]+$/;

function printResult(r: RepoResult): void {
  console.log(`${r.repo}`);
  console.log(`${r.url}\n`);
  console.log(
    `fit ${r.fitScore.toFixed(2)}   health ${r.healthScore.toFixed(2)}   gem ${r.gemScore.toFixed(2)}\n`,
  );
  console.log("signals:");
  console.log(`  stars        ${r.signals.stars}`);
  console.log(`  forks        ${r.signals.forks}`);
  console.log(`  open issues  ${r.signals.openIssues}`);
  console.log(
    `  pushed       ${r.signals.pushedDaysAgo === null ? "-" : `${r.signals.pushedDaysAgo}d ago`}`,
  );
  console.log(`  created      ${r.signals.createdAt ?? "-"}`);
  console.log(`  license      ${r.signals.license ?? "-"}`);
  console.log(`  contributors ${r.signals.contributors ?? "-"}`);
  console.log(`  last release ${r.signals.lastRelease ?? "-"}`);
  console.log(`  archived     ${r.signals.archived}`);
  console.log(`  fork         ${r.signals.isFork}`);
  console.log(`  language     ${r.signals.language ?? "-"}`);
  console.log(
    `  topics       ${r.signals.topics.length > 0 ? r.signals.topics.join(", ") : "-"}`,
  );
  console.log(`  description  ${r.signals.description ?? "-"}\n`);
  console.log("risk flags:");
  if (r.riskFlags.length === 0) {
    console.log("  none");
  } else {
    for (const flag of r.riskFlags) console.log(`  - ${flag}`);
  }
  console.log(`\nverdict:\n  ${r.verdict}\n`);
  console.log(`readme summary:\n  ${r.readmeSummary}`);
}

export function registerEval(program: Command): void {
  program
    .command("eval")
    .description("Deep evaluation of a single GitHub repo")
    .argument("<repo>", "owner/name")
    .option("--json", "print raw RepoResult JSON")
    .action(async (repo: string, opts: { json?: boolean }) => {
      try {
        if (!FULL_NAME_RE.test(repo)) {
          throw new Error(`expected owner/name, got "${repo}"`);
        }
        const core = createCore({});
        const result = await core.evaluate(repo);
        if (opts.json === true) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }
        printResult(result);
      } catch (err) {
        process.stderr.write(
          `ossfit: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(1);
      }
    });
}
