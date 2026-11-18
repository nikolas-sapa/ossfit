import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createCore } from "../core/index.js";
import type { SearchOptions } from "../core/index.js";
import { INDEX_HTML } from "./ui.js";

function numParam(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function strParam(v: string | undefined): string | undefined {
  const t = v === undefined ? "" : v.trim();
  return t === "" ? undefined : t;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function startWebServer(port: number): void {
  const core = createCore({});
  const app = new Hono();

  app.get("/", (c) => c.html(INDEX_HTML));

  app.get("/api/search", async (c) => {
    const q = strParam(c.req.query("q"));
    if (!q) return c.json({ error: "missing required param: q" }, 400);
    const opts: SearchOptions = {};
    const limit = numParam(c.req.query("limit"));
    const language = strParam(c.req.query("language"));
    const minStars = numParam(c.req.query("minStars"));
    const maxStars = numParam(c.req.query("maxStars"));
    const pushedWithinDays = numParam(c.req.query("pushedWithinDays"));
    const license = strParam(c.req.query("license"));
    if (limit !== undefined) opts.limit = limit;
    if (language !== undefined) opts.language = language;
    if (minStars !== undefined) opts.minStars = minStars;
    if (maxStars !== undefined) opts.maxStars = maxStars;
    if (pushedWithinDays !== undefined) opts.pushedWithinDays = pushedWithinDays;
    if (license !== undefined) opts.license = license;
    try {
      return c.json(await core.search(q, opts));
    } catch (err) {
      return c.json({ error: errMessage(err) }, 500);
    }
  });

  app.get("/api/eval", async (c) => {
    const repo = strParam(c.req.query("repo"));
    if (!repo) return c.json({ error: "missing required param: repo" }, 400);
    try {
      return c.json(await core.evaluate(repo));
    } catch (err) {
      return c.json({ error: errMessage(err) }, 500);
    }
  });

  app.get("/api/compare", async (c) => {
    const repos = (c.req.query("repos") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (repos.length === 0) {
      return c.json(
        { error: "missing required param: repos (comma-separated owner/name)" },
        400
      );
    }
    try {
      return c.json(await core.compare(repos));
    } catch (err) {
      return c.json({ error: errMessage(err) }, 500);
    }
  });

  serve({ fetch: app.fetch, port, hostname: "127.0.0.1" });
}
