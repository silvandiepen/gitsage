import { execSync } from "child_process";
import inquirer from "inquirer";
import { processGitDiff } from "../ai/openai";
import { CommitType } from "./types";
import * as log from "cli-block";

interface PullRequestContent {
    title: string;
    description: string;
    problem: string;
    solution: string;
    changes: string;
    commits: string;
    testing: string;
}

export async function getTargetBranch(): Promise<string> {
    const defaultBranches = ["main", "master", "develop"];
    const branches = execSync("git branch -r").toString().split("\n");

    const availableBranches = defaultBranches.filter(branch =>
        branches.some(b => b.trim() === `origin/${branch}`)
    );

    if (availableBranches.length === 0) {
        throw new Error("No default target branches (main/master/develop) found");
    }

    const { targetBranch } = await inquirer.prompt([
        {
            type: "list",
            name: "targetBranch",
            message: "Select target branch for PR:",
            choices: availableBranches
        }
    ]);

    return targetBranch;
}

export async function getBranchDiff(targetBranch: string): Promise<string> {
    try {
        const currentBranch = execSync("git branch --show-current").toString().trim();
        const diff = execSync(`git diff origin/${targetBranch}...${currentBranch}`).toString();
        return diff;
    } catch (error) {
        throw new Error(`Failed to get branch diff: ${error}`);
    }
}

export async function getCommitHistory(targetBranch: string): Promise<string> {
    try {
        const currentBranch = execSync("git branch --show-current").toString().trim();
        const commits = execSync(
            `git log --pretty=format:"%h - %s (%an)" origin/${targetBranch}..${currentBranch}`
        ).toString();
        return commits;
    } catch (error) {
        throw new Error(`Failed to get commit history: ${error}`);
    }
}

export async function generatePRContent(diff: string, commits: string): Promise<PullRequestContent> {
    const commitGroups = await processGitDiff(diff);

    // Generate title from the most significant change
    const title = commitGroups[0]?.message || "Update branch";

    // Group changes by type
    const changesByType = commitGroups.reduce<Record<string, string[]>>((acc, group) => {
        const type = group.type as string;
        if (!acc[type]) acc[type] = [];
        acc[type].push(group.message);
        return acc;
    }, {});

    // Format changes overview with better spacing
    const changesOverview = Object.entries(changesByType)
        .map(([type, messages]) => {
            const formattedMessages = messages.map((msg: string) => `  - ${msg}`).join("\n");
            return `${type.toUpperCase()}:\n${formattedMessages}`;
        })
        .join("\n\n");

    // Format commits with better spacing
    const formattedCommits = commits
        .split("\n")
        .map(commit => `  ${commit}`)
        .join("\n");

    return {
        title,
        description: `This PR implements ${title.toLowerCase()}`,
        problem: "Detailed problem description will be generated from commit messages",
        solution: "Solution overview will be generated from commit changes",
        changes: changesOverview,
        commits: formattedCommits || "No commits found",
        testing: "Testing details will be extracted from test-related changes"
    };
}

export async function generatePR(): Promise<void> {
    try {
        const targetBranch = await getTargetBranch();
        const diff = await getBranchDiff(targetBranch);
        const commits = await getCommitHistory(targetBranch);

        const prContent = await generatePRContent(diff, commits);

        log.start("📝 Generated Pull Request Content");
        log.blockHeader(prContent.title);

        log.blockMid("Problem");
        log.blockLine(prContent.problem);

        log.blockMid("Solution");
        log.blockLine(prContent.solution);

        log.blockMid("Changes");
        log.blockLine(prContent.changes);

        log.blockMid("Commits");
        log.blockLine(prContent.commits);

        log.blockMid("Testing");
        log.blockLine(prContent.testing);

        log.blockFooter();

        // Ask user if they want to create the PR
        const { createPR } = await inquirer.prompt([
            {
                type: "confirm",
                name: "createPR",
                message: "Would you like to create this PR on GitHub?",
                default: true
            }
        ]);

        if (createPR) {
            const currentBranch = execSync("git branch --show-current").toString().trim();
            // Create PR using GitHub CLI
            try {
                const prCommand = `gh pr create --base ${targetBranch} --head ${currentBranch} --title "${prContent.title}" --body "${prContent.description}\n\n## Problem\n${prContent.problem}\n\n## Solution\n${prContent.solution}\n\n## Changes\n${prContent.changes}\n\n## Testing\n${prContent.testing}"`;
                execSync(prCommand);
                log.blockLineSuccess("✨ Pull request created successfully!");
            } catch (error) {
                log.blockLineError(`Failed to create PR: ${error}\nMake sure you have GitHub CLI (gh) installed and authenticated.`);
            }
        }

    } catch (error) {
        log.blockLineError("Error generating PR content: " + error);
        throw error;
    }
}
