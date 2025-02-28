#!/usr/bin/env node

import { Command } from "commander";
import { analyzeAndCommit } from "./controllers/gitsage";
import { renameCommit } from "./modules/git/rename";
import { fixup } from "./modules/git/fixup";

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

program
  .command("fixup")
  .description("Add changes to a previous commit")
  .action(() => {
    fixup();
  });

program.parse(process.argv);
