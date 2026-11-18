import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Cache, RawRepo } from "./types.js";

const FRESHNESS_MS = 24 * 60 * 60 * 1000;

type RepoRow = {
  full_name: string;
  url: string;
  signals_json: string;
  readme_text: string | null;
  fetched_at: number;
};

function ftsQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t.replace(/"/g, "")}"`).join(" OR ");
}

export function openCache(dbPath: string): Cache {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS repos (
      full_name TEXT PRIMARY KEY,
      url TEXT,
      signals_json TEXT,
      readme_text TEXT,
      fetched_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS embeddings (
      key TEXT PRIMARY KEY,
      vec TEXT
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS readme_fts USING fts5(full_name, content);
  `);

  const getStmt = db.prepare(
    "SELECT full_name, url, signals_json, readme_text, fetched_at FROM repos WHERE full_name = ?",
  );
  const putStmt = db.prepare(
    `INSERT INTO repos (full_name, url, signals_json, readme_text, fetched_at)
     VALUES (@fullName, @url, @signalsJson, @readmeText, @fetchedAt)
     ON CONFLICT(full_name) DO UPDATE SET
       url = excluded.url,
       signals_json = excluded.signals_json,
       readme_text = excluded.readme_text,
       fetched_at = excluded.fetched_at`,
  );
  const ftsDeleteStmt = db.prepare("DELETE FROM readme_fts WHERE full_name = ?");
  const ftsInsertStmt = db.prepare(
    "INSERT INTO readme_fts (full_name, content) VALUES (?, ?)",
  );
  const getEmbStmt = db.prepare("SELECT vec FROM embeddings WHERE key = ?");
  const putEmbStmt = db.prepare(
    `INSERT INTO embeddings (key, vec) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET vec = excluded.vec`,
  );
  const bm25MinStmt = db.prepare(
    "SELECT bm25(readme_fts) AS rank FROM readme_fts WHERE readme_fts MATCH ? ORDER BY rank LIMIT 1",
  );
  const bm25RowStmt = db.prepare(
    "SELECT bm25(readme_fts) AS rank FROM readme_fts WHERE readme_fts MATCH ? AND full_name = ?",
  );
  const ftsSearchStmt = db.prepare(
    "SELECT full_name FROM readme_fts WHERE readme_fts MATCH ? ORDER BY rank",
  );

  return {
    getRepo(fullName: string): RawRepo | null {
      const row = getStmt.get(fullName) as RepoRow | undefined;
      if (row === undefined) return null;
      if (Date.now() - row.fetched_at > FRESHNESS_MS) return null;
      return {
        fullName: row.full_name,
        url: row.url,
        signals: JSON.parse(row.signals_json) as RawRepo["signals"],
        readmeText: row.readme_text,
      };
    },

    putRepo(repo: RawRepo): void {
      putStmt.run({
        fullName: repo.fullName,
        url: repo.url,
        signalsJson: JSON.stringify(repo.signals),
        readmeText: repo.readmeText,
        fetchedAt: Date.now(),
      });
      const ftsContent = [
        repo.fullName,
        repo.signals.description ?? "",
        repo.signals.topics.join(" "),
        repo.readmeText ?? "",
      ].join("\n");
      ftsDeleteStmt.run(repo.fullName);
      ftsInsertStmt.run(repo.fullName, ftsContent);
    },

    getEmbedding(key: string): number[] | null {
      const row = getEmbStmt.get(key) as { vec: string } | undefined;
      if (row === undefined) return null;
      return JSON.parse(row.vec) as number[];
    },

    putEmbedding(key: string, vec: number[]): void {
      putEmbStmt.run(key, JSON.stringify(vec));
    },

    bm25(query: string, fullName: string): number {
      const match = ftsQuery(query);
      if (match === null) return 0;
      try {
        const row = bm25RowStmt.get(match, fullName) as
          | { rank: number }
          | undefined;
        if (row === undefined) return 0;
        const minRow = bm25MinStmt.get(match) as { rank: number | null } | undefined;
        const best = minRow?.rank ?? 0;
        const magnitude = Math.max(Math.abs(best), Math.abs(row.rank), 1e-9);
        const normalized = Math.max(0, -row.rank) / magnitude;
        return Math.min(1, normalized);
      } catch {
        return 0;
      }
    },

    searchCached(query: string): string[] {
      const match = ftsQuery(query);
      if (match === null) return [];
      try {
        const rows = ftsSearchStmt.all(match) as { full_name: string }[];
        return rows.map((r) => r.full_name);
      } catch {
        return [];
      }
    },

    close(): void {
      db.close();
    },
  };
}
