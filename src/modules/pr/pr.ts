import { execSync } from "child_process";
import inquirer from "inquirer";
import { processGitDiff, getOpenAIInstance } from "../ai/openai";
import { CommitType } from "../../types/types";
import * as log from "cli-block";
import { detectGitPlatform, checkCLI, getTargetBranch, getBranchDiff, getCommitHistory, GitPlatform } from "../../utils/git";

interface PullRequestContent {
    title: string;
    description: string;
    problem: string;
    solution: string;
    changes: string;
    commits: string;
    testing: string;
}

export async function generatePRContent(diff: string, commits: string): Promise<PullRequestContent> {
    try {
        const commitGroups = await processGitDiff(diff);

        if (!Array.isArray(commitGroups)) {
            throw new Error('Invalid commit groups format received from processGitDiff');
        }

        // Group changes by type for better organization
        const changesByType = commitGroups.reduce<Record<string, string[]>>((acc, group) => {
            if (!group || typeof group.type !== 'string' || typeof group.message !== 'string') {
                return acc;
            }
            const type = group.type;
            if (!acc[type]) acc[type] = [];
            acc[type].push(group.message);
            return acc;
        }, {});

        // Generate title using OpenAI based on the complete context
        let title = '';
        try {
            const openai = await getOpenAIInstance();
            const titleResponse = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert at creating clear and meaningful PR titles. Generate a concise but descriptive title that captures the main purpose and impact of the changes. The title should be specific and actionable."
                    },
                    {
                        role: "user",
                        content: `Please create a PR title based on these changes:\n\nChanges by type:\n${JSON.stringify(changesByType, null, 2)}\n\nCommits:\n${commits}`
                    }
                ],
                temperature: 0.2
            });
            title = titleResponse.choices[0]?.message?.content?.trim() || '';
        } catch (error) {
            // Fallback to conventional title generation if OpenAI fails
            title = generateComprehensiveTitle(changesByType);
        }

        // Format changes overview with better spacing
        const changesOverview = Object.entries(changesByType)
            .map(([type, messages]) => {
                const formattedMessages = messages.map((msg: string) => `  - ${msg}`).join("\n");
                return `${type.toUpperCase()}:\n${formattedMessages}`;
            })
            .join("\n\n");

        // Format commits with better spacing
        const formattedCommits = (commits || "").split("\n")
            .map(commit => `  ${commit}`)
            .join("\n");

        // Generate meaningful problem and solution descriptions
        const { problem, solution } = generateProblemAndSolution(changesByType, commitGroups as Array<{ type: string; message: string; }>);

        return {
            title: title || generateComprehensiveTitle(changesByType),
            description: `This PR ${generateDescription(changesByType)}`,
            problem,
            solution,
            changes: changesOverview || "No changes detected",
            commits: formattedCommits || "No commits found",
            testing: generateTestingDetails(changesByType)
        };
    } catch (error) {
        throw new Error(`Failed to generate PR content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Fallback title generation when AI is unavailable
function generateComprehensiveTitle(changesByType: Record<string, string[]>): string {
    const types = Object.keys(changesByType);

    if (types.length === 1) {
        const type = types[0];
        const messages = changesByType[type];
        // For single change, use the message directly
        if (messages.length === 1) {
            return `${type}: ${messages[0]}`;
        }
        // For multiple changes of same type, highlight key changes
        const significantChanges = messages.slice(0, 2).join(' and ');
        return `${type}: ${significantChanges}${messages.length > 2 ? ` (and ${messages.length - 2} more)` : ''}`;
    }

    // For multiple types, create a meaningful summary focusing on major changes
    const significantChanges = types.map(type => {
        const messages = changesByType[type];
        const mainMessage = messages[0];
        return `${type}(${messages.length}): ${mainMessage}`;
    }).join('; ');

    return significantChanges;
}

function generateDescription(changesByType: Record<string, string[]>): string {
    const types = Object.keys(changesByType);
    const mainChanges = types.map(type => {
        const changes = changesByType[type];
        const mainMessage = changes[0];
        if (changes.length === 1) {
            return mainMessage.toLowerCase();
        }
        const significantChanges = changes.slice(0, 2).map(msg => msg.toLowerCase()).join(' and ');
        return `${significantChanges}${changes.length > 2 ? ` (and ${changes.length - 2} more ${type} changes)` : ''}`;
    }).join(', with ');

    return `implements ${mainChanges}`;
}

function generateProblemAndSolution(
    changesByType: Record<string, string[]>,
    commitGroups: Array<{ type: string; message: string }>
): { problem: string; solution: string } {
    // Generate a detailed problem statement
    const problems = Object.entries(changesByType)
        .filter(([type]) => ['fix', 'perf', 'security'].includes(type))
        .flatMap(([_, messages]) => messages)
        .map(msg => `  - ${msg}`);

    // Generate a comprehensive solution description
    const solutions = commitGroups.map(({ type, message }) => {
        switch (type) {
            case 'feat':
                return `Implemented ${message.toLowerCase()}`;
            case 'fix':
                return `Fixed ${message.toLowerCase()}`;
            case 'refactor':
                return `Refactored ${message.toLowerCase()}`;
            case 'perf':
                return `Optimized ${message.toLowerCase()}`;
            default:
                return message;
        }
    });

    const problemStatement = problems.length > 0
        ? `The codebase had the following issues that needed to be addressed:\n${problems.join('\n')}`
        : `This PR introduces new features and improvements to enhance the codebase`;

    const solutionStatement = `This PR addresses these needs by:\n  - ${solutions.join('\n  - ')}`;

    return {
        problem: problemStatement,
        solution: solutionStatement
    };
}

function generateTestingDetails(changesByType: Record<string, string[]>): string {
    if (changesByType['test']) {
        return `The following tests were added or updated:\n${changesByType['test'].map(test => `  - ${test}`).join('\n')}`;
    }

    const testingByType: Record<string, string> = {
        fix: 'Existing test suite verifies the fixes',
        feat: 'New functionality has been tested through manual verification',
        docs: 'Documentation changes have been reviewed for accuracy',
        style: 'Style changes are visual-only and require no functional testing',
        refactor: 'Refactoring changes maintain existing behavior and are covered by existing tests',
    };

    const relevantTypes = Object.keys(changesByType).filter(type => testingByType[type]);
    if (relevantTypes.length > 0) {
        return relevantTypes.map(type => testingByType[type]).join('\n');
    }

    return 'No specific testing required for these changes';
}

export async function generatePR(): Promise<void> {
    try {
        const platform = detectGitPlatform();

        // Check if appropriate CLI is available
        if (!checkCLI(platform)) {
            log.start("CLI Check");
            log.blockHeader("CLI Tool Not Found");

            if (platform === 'github') {
                log.blockLine("The GitHub CLI (gh) is required to create pull requests.");
                log.blockMid("Installation Instructions");
                log.blockLine("1. Install GitHub CLI: https://cli.github.com");
                log.blockLine("2. Authenticate with: gh auth login");
            } else if (platform === 'bitbucket') {
                log.blockLine("The Bitbucket CLI (bb) is required to create pull requests.");
                log.blockMid("Installation Instructions");
                log.blockLine("1. Install Bitbucket CLI: https://bitbucket.org/atlassian/bitbucket-cli");
                log.blockLine("2. Authenticate with: bb auth login");
            } else {
                log.blockLine("Unsupported Git platform or unable to detect platform.");
                log.blockLine("Currently supported platforms: GitHub, Bitbucket");
            }

            log.blockFooter();
            return; // Return instead of throwing error for missing CLI
        }

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
                message: `Would you like to create this PR on ${platform === 'github' ? 'GitHub' : 'Bitbucket'}?`,
                default: true
            }
        ]);

        if (createPR) {
            const currentBranch = execSync("git branch --show-current").toString().trim();
            try {
                let prCommand = '';
                if (platform === 'github') {
                    // Escape single quotes in content to prevent command injection
                    let escapedTitle = prContent.title.replace(/'/g, "'\\''")

                    //if the tiltle is fully in quotes, we remove the quotes around it
                    if (escapedTitle.startsWith("'") && escapedTitle.endsWith("'")) {
                        escapedTitle = escapedTitle.slice(1, -1);
                    }

                    const escapedBody = `${prContent.description}\n\n## Problem\n${prContent.problem}\n\n## Solution\n${prContent.solution}\n\n## Changes\n${prContent.changes}\n\n## Testing\n${prContent.testing}`.replace(/'/g, "'\\''")
                    prCommand = `gh pr create --base '${targetBranch}' --head '${currentBranch}' --title '${escapedTitle}' --body '${escapedBody}'`;
                } else if (platform === 'bitbucket') {
                    prCommand = `bb pr create --source ${currentBranch} --target ${targetBranch} --title "${prContent.title}" --description "${prContent.description}\n\n## Problem\n${prContent.problem}\n\n## Solution\n${prContent.solution}\n\n## Changes\n${prContent.changes}\n\n## Testing\n${prContent.testing}"`;
                }
                execSync(prCommand);
                log.blockLineSuccess("✨ Pull request created successfully!");
            } catch (error) {
                const errorMessage = `Failed to create PR: ${error}\nMake sure you have the appropriate CLI tool installed and authenticated.`;
                log.blockLineError(errorMessage);
                throw new Error("PR creation failed"); // Throw specific error message expected by test
            }
        }

    } catch (error) {
        log.blockLineError("Error generating PR content: " + error);
        if (error instanceof Error && error.message === "PR creation failed") {
            throw error;
        }
        throw new Error("PR creation failed");
    }
}
