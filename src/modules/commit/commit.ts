import { execSync } from "child_process";
import inquirer from "inquirer";
import { CommitType } from '../../types/types';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

/**
 * Executes a shell command and returns its output
 * @param {string} cmd - The shell command to execute
 * @returns {string} The command output as a trimmed string
 */
export function runCommand(cmd: string): string {
    try {
        return execSync(cmd, { encoding: "utf-8" }).trim();
    } catch (error: any) {
        console.error(`Command failed: ${cmd}\nError: ${error.message}`);
        return error.message; // Return error message instead of an empty string
    }
}



/**
 * Converts a Git status code to a corresponding emoji
 * @param {string} status - The Git status code ('M', 'D', 'U', etc.)
 * @returns {string} An emoji representing the file status
 */
export function getFileStatusEmoji(status: string): string {
    const statusMap: Record<string, string> = {
        M: '📝',  // Modified
        D: '🗑️',  // Deleted
        U: '➕',  // Untracked (not part of git diff --name-status)
        A: '✅',  // Added
        R: '🔄',  // Renamed
        C: '📋',  // Copied
        '?': '❓', // Unknown / Untracked (git status --short returns '??' at the start)
    };
    return statusMap[status] || '❓';
}



/**
 * Retrieves a list of files that have changes but are not staged
 * @returns {Array<{name: string, value: string, status: string}>} Array of unstaged file objects
 */
export function getUnstagedFiles(): { name: string; value: string; status: string }[] {
    const unstagedFiles = runCommand("git diff --name-status --relative").split("\n").filter(Boolean);
    return unstagedFiles.map(file => {
        const match = file.match(/^(\w+)\s(.+)$/); // Safer match
        if (!match) return { name: file, value: file, status: '?' };
        const [, status, path] = match;
        return { name: path, value: path, status };
    });
}



/**
 * Retrieves a list of files that are not tracked by Git
 * @returns {Array<{name: string, value: string, status: string}>} Array of untracked file objects
 */
export function getUntrackedFiles(): { name: string; value: string; status: string }[] {
    const untrackedFiles = runCommand("git ls-files --others --exclude-standard").split("\n").filter(Boolean);
    return untrackedFiles.map(file => ({
        name: file,
        value: file,
        status: 'U'
    }));
}

/**
 * Retrieves information about files that are staged for commit
 * @returns {{files: string[], diff: string}} Object containing staged files and their diff
 */
export function getStagedFiles(): { files: string[]; diff: string } {
    const files = runCommand("git diff --staged --name-status").split("\n").filter(Boolean);
    const diff = runCommand("git diff --staged --unified=0");
    return { files, diff };
}

/**
 * Stages the specified files for commit
 * @param {string[]} files - Array of file paths to stage
 */
export function stageFiles(files: string[]): void {
    files.forEach(file => {
        runCommand(`git add "${file}"`);
    });
}

/**
 * Stages specific files for commit based on the hunks they belong to
 * @param {string[]} files - Array of file paths to stage
 * @param {string[]} hunks - Array of patch hunks that belong to this commit
 */

/**
 * Validates if a patch can be applied successfully
 * @param {string} patchContent - The patch content to validate
 * @returns {boolean} True if the patch is valid and can be applied
 */
export function validatePatch(patchContent: string): boolean {
    const tempPatchFile = join(tmpdir(), `.temp-${Date.now()}.patch`);

    try {
        writeFileSync(tempPatchFile, patchContent, 'utf8');
        execSync(`git apply --check ${tempPatchFile}`, { stdio: 'pipe' });
        console.log(tempPatchFile)
        return true;
    } catch (error: any) {
        console.error('\n⚠️ Patch validation failed!');

        // Extract line number from error message
        const lineMatch = error.message.match(/error: corrupt patch at line (\d+)/);
        const errorLine = lineMatch ? parseInt(lineMatch[1]) : null;

        if (errorLine) {
            const patchLines = patchContent.split('\n');
            const contextStart = Math.max(0, errorLine - 3);
            const contextEnd = Math.min(patchLines.length, errorLine + 2);

            console.error('\nProblem detected around line', errorLine);
            console.error('Context:');

            for (let i = contextStart; i < contextEnd; i++) {
                const prefix = i + 1 === errorLine ? '>>> ' : '    ';
                console.error(`${prefix}${(i + 1).toString().padStart(3, ' ')}: ${patchLines[i]}`);
            }
        }

        console.error('\nError details:', error.message);
        return false;
    } finally {
        if (existsSync(tempPatchFile)) {
            unlinkSync(tempPatchFile);
        }
    }
}

/**
 * Stages specific files for commit based on the hunks they belong to
 * @param {string[]} hunks - Array of patch hunks that belong to this commit
 */
export function stageFilesForCommit(hunks: string[]): void {
    if (hunks.length === 0) {
        console.warn("No hunks to stage.");
        return;
    }

    const patchContent = hunks.join('\n');
    if (!validatePatch(patchContent)) {
        console.error('Invalid patch content. Aborting staging process.');
        return;
    }

    const tempPatchFile = join(tmpdir(), `git-patch-${Date.now()}.patch`);

    try {
        writeFileSync(tempPatchFile, patchContent, 'utf8');
        execSync(`git apply --cached ${tempPatchFile}`, { stdio: 'inherit' });
    } catch (error) {
        console.error('Failed to apply patch:', error);
    } finally {
        if (existsSync(tempPatchFile)) {
            unlinkSync(tempPatchFile);
        }
    }
}


/**
 * Creates a Git commit with the specified type and message
 * @param {string} type - The type of commit (feat, fix, etc.)
 * @param {string} message - The commit message
 * @param {string[]} hunks - Array of patch hunks that belong to this commit
 */
export function createCommit(type: CommitType, message: string, hunks: string[] = []): void {
    if (hunks.length > 0) {
        stageFilesForCommit(hunks);
    }

    const safeMessage = JSON.stringify(`${type}: ${message}`).replace(/"/g, '\\"');
    runCommand(`git commit -m "${safeMessage}"`);
}



/**
 * Prompts the user to select files for staging
 * @param {Array<{name: string, value: string, status: string}>} allChanges - Array of all changed files
 * @returns {Promise<string[]>} Promise resolving to array of selected file paths
 */
export async function promptFileSelection(allChanges: { name: string; value: string; status: string }[]): Promise<string[]> {
    const { filesToStage } = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'filesToStage',
            message: 'Select files to stage:',
            choices: allChanges.map(file => ({
                name: `${getFileStatusEmoji(file.status)} ${file.name}`,
                value: JSON.stringify(file.value) // Properly escape the value
            }))
        }
    ]);
    return filesToStage.map((file: string) => JSON.parse(file)); // Convert back to the original filename
}
