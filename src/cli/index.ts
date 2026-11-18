#!/usr/bin/env node
import { Command } from "commander";
import { registerSearch } from "./search.js";
import { registerEval } from "./eval.js";
import { registerCompare } from "./compare.js";
import { registerServe } from "./serve.js";
import { registerMcp } from "./mcp.js";

const program = new Command();
program
  .name("ossfit")
  .description("Better GitHub discovery — ranked by fit, health, and underrated potential.")
  .version("0.1.0");

registerSearch(program);
registerEval(program);
registerCompare(program);
registerServe(program);
registerMcp(program);

program.parse();
