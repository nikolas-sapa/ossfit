import type { Command } from "commander";
import { startWebServer } from "../web/server.js";

export function registerServe(program: Command): void {
  program
    .command("serve")
    .description("Start the self-hosted web UI")
    .option("-p, --port <port>", "port to listen on", "4300")
    .action((opts: { port: string }) => {
      const port = Number.parseInt(opts.port, 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        console.error(`error: invalid port "${opts.port}"`);
        process.exitCode = 1;
        return;
      }
      startWebServer(port);
      console.log(`ossfit web UI listening on http://localhost:${port}`);
    });
}
