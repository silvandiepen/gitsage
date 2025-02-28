#!/usr/bin/env node

import { Command } from "commander";
import { analyzeAndCommit } from "./controllers/gitsage";
import { renameCommit } from "./modules/git/rename";

const program = new Command();

program
  .name("gitsage")
  .description("AI-powered commit automation")
  .version("1.0.0");

program
  .command("commit")
  .description("Automatically commit changes using AI")
  .action(() => {
    analyzeAndCommit();
  });

program
  .command("rename")
  .description("Rename a commit message")
  .argument("[hash]", "Optional commit hash to rename")
  .action((hash) => {
    renameCommit(hash);
  });

program.parse(process.argv);
