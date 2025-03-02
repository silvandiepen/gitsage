import { getUnstagedFiles, getUntrackedFiles, getStagedFiles, stageFiles, createCommit, promptFileSelection } from "../../modules/commit";
import { processGitDiff } from "../../modules/ai";
import inquirer from "inquirer";

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
 *
 * @example
 * const { diff, summary } = await getGitChanges();
 * if (summary) {
 *   console.log(summary);
 * }
 */
async function getGitChanges(): Promise<{ diff: string; summary: string }> {
    let diff = "";
    let summary = "";
    let totalChanges = 0;

    // Get staged files information
    const { files: stagedFiles, diff: stagedDiff } = getStagedFiles();

    // If no staged changes, prompt user to select files to stage
    if (stagedFiles.length === 0) {
        // Get all unstaged and untracked files
        const unstagedFiles = getUnstagedFiles();
        const untrackedFiles = getUntrackedFiles();
        const allChanges = [...unstagedFiles, ...untrackedFiles];

        if (allChanges.length === 0) {
            return { diff: "", summary: "" };
        }

        // Prompt user to select files to stage
        const filesToStage = await promptFileSelection(allChanges);

        // Stage selected files
        stageFiles(filesToStage);

        // Get updated staged files information
        const { files: updatedStagedFiles, diff: updatedStagedDiff } = getStagedFiles();

        if (updatedStagedFiles.length === 0) {
            return { diff: "", summary: "No files were staged." };
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

    return { diff: diff.trim(), summary: summary.trim() };
}

/**
 * Analyzes Git changes using AI and creates commits based on the analysis.
 *
 * This function performs the following operations:
 * 1. Retrieves and summarizes Git changes
 * 2. Sends changes to AI for analysis
 * 3. Presents AI-generated commit messages for user confirmation
 * 4. Creates commits if user confirms
 *
 * The function uses OpenAI to analyze git diffs and generate semantic commit messages
 * following conventional commit format (feat, fix, etc.).
 *
 * @returns {Promise<void>}
 *
 * @example
 * await analyzeAndCommit();
 *
 * @throws {Error} If the AI analysis fails or if there are issues with Git operations
 */
export async function analyzeAndCommit() {
    console.log("🧠 Analyzing Git changes...");
    const { diff, summary } = await getGitChanges();

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

    // Proceed with committing if confirmed
    commitGroups.forEach(({ type, message }) => {
        console.log(`\n📌 Committing: ${message}`);
        createCommit(type, message);
    });

    console.log("\n✅ All commits created successfully!");
}
