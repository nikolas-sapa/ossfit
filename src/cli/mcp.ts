import { Command } from "commander";
import { startMcpServer } from "../mcp/server.js";

export function registerMcp(program: Command): void {
  program
    .command("mcp")
    .description("Run ossfit as a stdio MCP server for AI agents")
    .action(async () => {
      await startMcpServer();
    });
}
