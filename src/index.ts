#!/usr/bin/env node

import { Command } from "commander";
import { analyzeAndCommit } from "./controllers/gitmind";

const program = new Command();

program
  .name("gitmind")
  .description("AI-powered commit automation")
  .version("1.0.0");

program
  .command("commit")
  .description("Automatically commit changes using AI")
  .action(() => {
    analyzeAndCommit();
  });

program.parse(process.argv);
