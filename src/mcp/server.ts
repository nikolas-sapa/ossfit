import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createCore } from "../core/index.js";

const repoName = z
  .string()
  .regex(/^[\w.-]+\/[\w.-]+$/, 'Expected "owner/name"')
  .describe('Full repository name in "owner/name" form');

function jsonResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

export async function startMcpServer(): Promise<void> {
  const core = createCore({});

  const server = new McpServer({ name: "ossfit", version: "0.1.0" });

  server.registerTool(
    "search_repositories",
    {
      description:
        "Search GitHub for repositories matching a query, ranked by fit, health, and underrated-gem score. Returns RepoResult[] as JSON.",
      inputSchema: {
        query: z.string().describe("Search query, e.g. 'rate limiter for hono edge'"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20, max 50)"),
        language: z.string().optional().describe("Filter by primary language, e.g. 'TypeScript'"),
        minStars: z.number().int().min(0).optional(),
        maxStars: z.number().int().min(0).optional(),
        pushedWithinDays: z.number().int().min(1).optional().describe("Only repos pushed within the last N days"),
        license: z.string().optional().describe("Filter by license, e.g. 'mit'"),
        excludeForks: z.boolean().optional().describe("Exclude forked repositories (default true)"),
        excludeArchived: z.boolean().optional().describe("Exclude archived repositories (default true)"),
      },
    },
    async ({ query, ...opts }) => {
      try {
        return jsonResult(await core.search(query, opts));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "evaluate_repository",
    {
      description:
        "Deep-evaluate a single GitHub repository: fit/health/gem scores, verdict, risk flags, and signals. Returns a RepoResult as JSON.",
      inputSchema: {
        repo: repoName,
      },
    },
    async ({ repo }) => {
      try {
        return jsonResult(await core.evaluate(repo));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "compare_repositories",
    {
      description:
        "Compare 2-5 GitHub repositories side-by-side with fit/health/gem scores and verdicts. Returns RepoResult[] as JSON.",
      inputSchema: {
        repos: z.array(repoName).min(2).max(5).describe('2-5 "owner/name" repository names'),
      },
    },
    async ({ repos }) => {
      try {
        return jsonResult(await core.compare(repos));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  await server.connect(new StdioServerTransport());
}
