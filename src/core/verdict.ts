import type { RepoSignals, Scores } from "./types.js";

export type VerdictInput = {
  scores: Scores;
  signals: RepoSignals;
  readmeText: string | null;
  query?: string; // absent on eval/compare → verdict describes health only
};

export type VerdictOutput = {
  verdict: string;
  riskFlags: string[];
  readmeSummary: string;
};

const SUMMARY_MAX_CHARS = 280;
const LOW_DOCS_CHARS = 500;

export function makeVerdict(input: VerdictInput): VerdictOutput {
  const riskFlags = detectRiskFlags(input.signals, input.readmeText);
  return {
    verdict: verdictLine(input.scores, riskFlags, input.query !== undefined),
    riskFlags,
    readmeSummary: summarizeReadme(input.readmeText, input.signals),
  };
}

function detectRiskFlags(signals: RepoSignals, readmeText: string | null): string[] {
  const flags: string[] = [];
  if (signals.archived) flags.push("archived");
  // mutually exclusive: report only the worse staleness band
  if (signals.pushedDaysAgo !== null) {
    if (signals.pushedDaysAgo > 365) flags.push("stale-commits-365d+");
    else if (signals.pushedDaysAgo > 180) flags.push("stale-commits-180d+");
  }
  if (signals.lastRelease === null) flags.push("no-releases");
  if (signals.contributors === 1) flags.push("single-maintainer");
  if (signals.license === null) flags.push("no-license");
  if (signals.isFork) flags.push("fork");
  if (readmeText === null || readmeText.trim().length === 0) {
    flags.push("no-readme");
  } else if (readmeText.length < LOW_DOCS_CHARS) {
    flags.push("low-docs");
  }
  return flags;
}

function verdictLine(
  scores: Scores,
  riskFlags: string[],
  hasQuery: boolean,
): string {
  const { fit, health } = scores;
  let base: string;
  if (!hasQuery) {
    if (health >= 0.7) base = "active, well-maintained";
    else if (health >= 0.4) base = "moderately maintained";
    else base = "maintenance risk";
  } else if (fit >= 0.7) {
    if (health >= 0.7) base = "strong fit — active, documented";
    else if (health >= 0.4) base = "strong topical fit, moderate maintenance";
    else base = "topical match but maintenance risk";
  } else if (fit >= 0.4) {
    if (health >= 0.7) base = "moderate fit — healthy and active";
    else if (health >= 0.4) base = "moderate fit, moderate maintenance";
    else base = "moderate match but maintenance risk";
  } else {
    base = "weak match";
  }
  const top = riskFlags.slice(0, 2);
  return top.length > 0 ? `${base} — flags: ${top.join(", ")}` : base;
}

function summarizeReadme(readmeText: string | null, signals: RepoSignals): string {
  if (readmeText !== null) {
    const summary = firstParagraph(readmeText);
    if (summary.length > 0) return truncate(summary, SUMMARY_MAX_CHARS);
  }
  return truncate(signals.description ?? "", SUMMARY_MAX_CHARS);
}

// First non-heading, non-badge, non-image paragraph, stripped of markdown.
function firstParagraph(markdown: string): string {
  let paragraph: string[] = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0) {
      const cleaned = cleanMarkdown(paragraph.join(" "));
      if (cleaned.length > 0) return cleaned;
      paragraph = [];
      continue;
    }
    if (isNoiseLine(line)) continue;
    paragraph.push(line);
  }
  return cleanMarkdown(paragraph.join(" "));
}

function isNoiseLine(line: string): boolean {
  if (/^#{1,6}\s/.test(line)) return true; // heading
  if (/^(?:-{3,}|\*{3,}|_{3,}|={3,})$/.test(line)) return true; // hr / setext underline
  if (/^<!--/.test(line)) return true; // html comment
  if (/^<[a-zA-Z/!]/.test(line)) return true; // html block tag (<div>, <img>, </p>, <!doctype>)
  if (/^([\w-]+="[^"]*"\s*)+\/?>?$/.test(line)) return true; // html attr continuation (multi-line tag)
  if (/^\/?>$/.test(line)) return true; // stray tag closer (`>` or `/>`)
  if (/^\|/.test(line)) return true; // table row
  // badge / image / link-only lines: strip images and links; empty remainder = noise
  const stripped = line
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return stripped.trim().length === 0;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/<[^>]+>/g, "") // html tags
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code spans / fenced inline
    .replace(/^>\s?/gm, "") // blockquote marker
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "") // list markers
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italic
    .replace(/~~(.*?)~~/g, "$1") // strikethrough
    .replace(/^#{1,6}\s+/gm, "") // heading markers (safety)
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;
  return base.trimEnd() + "…";
}
