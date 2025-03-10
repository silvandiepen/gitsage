import { runCommand, getStagedFiles, stageFiles, createCommit, getUnstagedFiles, getUntrackedFiles, promptFileSelection } from "./commit";
import { processGitDiff } from "../ai";
import inquirer from "inquirer";
import { existsSync, unlinkSync, writeFileSync } from "fs";

/**
 * Retrieves Git changes and generates a summary of staged and unstaged files.
 *
 * This function performs the following operations:
 * 1. Checks for staged files
 * 2. If no staged files, prompts user to select files to stage from unstaged and untracked files
 * 3. Generates a summary of all staged changes
 *
 * @returns {Promise<{diff: string, summary: string}>} Object containing:
 *   - diff: The git diff of staged changes
 *   - summary: A formatted summary of all staged changes
 */
export async function getGitChanges(): Promise<{ diff: string; summary: string; hasDependencyChanges: boolean }> {
    let diff = "";
    let summary = "";
    let totalChanges = 0;
    let hasDependencyChanges = false;

    // Get staged files information
    const { files: stagedFiles, diff: stagedDiff } = getStagedFiles();

    // Check for package dependency changes
    const dependencyFiles = stagedFiles.filter(file => {
        const [, path] = file.split(/\s+/);
        return path === 'package.json' || path === 'package-lock.json';
    });

    if (dependencyFiles.length > 0) {
        hasDependencyChanges = true;
    }

    // If no staged changes, prompt user to select files to stage
    if (stagedFiles.length === 0) {
        // Get all unstaged and untracked files
        const unstagedFiles = getUnstagedFiles();
        const untrackedFiles = getUntrackedFiles();
        const allChanges = [...unstagedFiles, ...untrackedFiles];

        if (allChanges.length === 0) {
            return { diff: "", summary: "", hasDependencyChanges: false };
        }

        // Prompt user to select files to stage
        const filesToStage = await promptFileSelection(allChanges);

        if (!filesToStage || filesToStage.length === 0) {
            return { diff: "", summary: "No files were selected to stage.", hasDependencyChanges: false };
        }

        // Stage selected files
        stageFiles(filesToStage);

        // Get updated staged files information
        const { files: updatedStagedFiles, diff: updatedStagedDiff } = getStagedFiles();

        if (updatedStagedFiles.length === 0) {
            return { diff: "", summary: "No files were staged.", hasDependencyChanges: false };
        }

        stagedFiles.push(...updatedStagedFiles);
        diff = updatedStagedDiff;
    } else {
        diff = stagedDiff;
    }

    // Build summary for staged changes
    if (stagedFiles.length > 0) {
        summary += "\n📊 Git Changes Summary:\n";
        summary += "===================\n";
        summary += "\n✅ Staged Changes:\n";

        stagedFiles.forEach(file => {
            const [status, path] = file.split(/\s+/);
            const emoji = status === 'M' ? '📝' : status === 'D' ? '🗑️' : '❓';
            summary += `  ${emoji} ${path}\n`;
            totalChanges++;
        });

        summary += "\n📈 Total Changes: " + totalChanges;
    }

    return { diff: diff.trim(), summary: summary.trim(), hasDependencyChanges };
}

/**
 * Analyzes Git changes using AI and creates multiple semantic commits based on the analysis.
 *
 * This function performs the following operations:
 * 1. Retrieves and summarizes Git changes
 * 2. Sends changes to AI for analysis
 * 3. Presents AI-generated commit messages for user confirmation
 * 4. For each commit:
 *    - Temporarily unstages all changes
 *    - Applies relevant changes using patch files
 *    - Creates a commit with the specific changes
 *
 * @returns {Promise<void>}
 * @throws {Error} If the AI analysis fails, patch application fails, or if there are issues with Git operations
 */
export async function analyzeAndCommit(): Promise<void> {
    console.log("🧠 Analyzing Git changes...");
    let { diff, summary, hasDependencyChanges } = await getGitChanges();

    // Handle dependency changes first if present
    if (hasDependencyChanges) {
        console.log("📦 Detected package dependency changes. Creating separate commit...");
        // Reset staging area
        runCommand("git reset");
        // Stage only dependency files
        runCommand("git add package.json package-lock.json");
        // Create dependency commit
        createCommit("chore", "update dependencies");
        // Get remaining changes
        const { diff: remainingDiff, summary: remainingSummary } = await getGitChanges();
        diff = remainingDiff;
        summary = remainingSummary;
    }

    if (!diff) {
        console.log("No changes detected.");
        return;
    }

    // Display the summary before AI processing
    if (summary) {
        console.log(summary);
        console.log("\n🤖 Sending changes to AI for analysis...");
    }

    const commitGroups = await processGitDiff(diff);

    if (commitGroups.length === 0) {
        console.log("⚠️ AI did not generate any commit messages. Aborting.");
        return;
    }

    // Generate summary for user confirmation
    console.log("\n🔹 AI-generated commit summary:");
    commitGroups.forEach(({ type, message }, index) => {
        console.log(`\n[${index + 1}] ${(type as string).toUpperCase()}: ${message}`);
    });

    // Ask user for confirmation before committing
    const { confirmCommit } = await inquirer.prompt([
        {
            type: "confirm",
            name: "confirmCommit",
            message: "Do you want to apply these commits?",
            default: true,
        },
    ]);

    if (!confirmCommit) {
        console.log("❌ Commit process aborted by user.");
        return;
    }

    // Reset all staged changes first to ensure a clean slate
    runCommand("git reset");

    // Proceed with committing each group of changes separately
    for (const { type, message, hunks } of commitGroups) {
        console.log(`\n🔹 Processing commit: ${message}`);

        // Only unstage changes without discarding modifications
        runCommand("git restore --staged .");

        if (hunks.length === 0) {
            console.warn(`⚠️ No hunks available for commit: "${message}"`);
            continue;
        }

        // Extract file paths from hunks
        const fileRegex = /^diff --git a\/(.*?) b\/(.*?)$/gm;
        const filesToStage = new Set<string>();

        for (const hunk of hunks) {
            let match;
            while ((match = fileRegex.exec(hunk)) !== null) {
                const filePath = match[2]; // Use the 'b' path as it represents the new path
                filesToStage.add(filePath);
            }
        }

        if (filesToStage.size === 0) {
            console.warn(`⚠️ No valid files found for commit: "${message}"`);
            continue;
        }

        // Stage each file
        for (const file of filesToStage) {
            try {
                // Check if file exists in the working directory
                if (existsSync(file)) {
                    runCommand(`git add "${file}"`);
                } else {
                    // If file doesn't exist, it might be a deletion
                    try {
                        runCommand(`git rm "${file}"`);
                    } catch (error) {
                        console.warn(`⚠️ Failed to stage deletion of file: ${file}`);
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Failed to stage file: ${file}`);
            }
        }

        // Check if the staging area actually has changes before committing
        const { files: stagedFiles } = getStagedFiles();
        if (stagedFiles.length === 0) {
            console.warn(`⚠️ No staged changes for commit: "${message}"`);
            continue;
        }

        // Create the commit
        createCommit(type, message);
    }

    console.log("\n✅ All commits created successfully!");
    }

