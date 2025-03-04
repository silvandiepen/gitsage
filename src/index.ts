#!/usr/bin/env node

import { Command } from "commander";
import { analyzeAndCommit } from "./controllers/gitsage";
import { renameCommit } from "./modules/rename";
import { fixup } from "./modules/fixup";
import { generatePR } from "./modules/pr";
import { pushBranch } from "./modules/branch";
import { branchCommand } from "./controllers/branch";
import { configureSettings } from "./modules/config/config";

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

program
  .command("pr")
  .description("Generate pull request content using AI analysis")
  .action(() => {
    generatePR();
  });

program
  .command("config")
  .description("Configure GitSage settings")
  .action(() => {
    configureSettings();
  });

program
  .command("branch")
  .description("Interactive branch management")
  .action(() => {
    branchCommand();
  });

program
  .command("push")
  .description("Push current branch to remote with upstream and force push handling")
  .action(() => {
    pushBranch();
  });

program.parse(process.argv);
