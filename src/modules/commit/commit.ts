import { execSync } from "child_process";
import inquirer from "inquirer";
import { CommitType } from '../../types/types';

/**
 * Executes a shell command and returns its output
 * @param {string} cmd - The shell command to execute
 * @returns {string} The command output as a trimmed string
 */
export function runCommand(cmd: string): string {
    try {
        return execSync(cmd, { encoding: "utf-8" }).trim();
    } catch (error) {
        return "";
    }
}

/**
 * Converts a Git status code to a corresponding emoji
 * @param {string} status - The Git status code ('M', 'D', 'U', etc.)
 * @returns {string} An emoji representing the file status
 */
export function getFileStatusEmoji(status: string): string {
    return status === 'M' ? '📝' : status === 'D' ? '🗑️' : status === 'U' ? '➕' : '❓';
}

/**
 * Retrieves a list of files that have changes but are not staged
 * @returns {Array<{name: string, value: string, status: string}>} Array of unstaged file objects
 */
export function getUnstagedFiles(): { name: string; value: string; status: string }[] {
    const unstagedFiles = runCommand("git diff --name-status").split("\n").filter(Boolean);
    return unstagedFiles.map(file => {
        const [status, path] = file.split(/\s+/);
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
 * Creates a Git commit with the specified type and message
 * @param {string} type - The type of commit (feat, fix, etc.)
 * @param {string} message - The commit message
 */
export function createCommit(type: CommitType, message: string): void {
    runCommand(`git commit -m "${type}: ${message}"`);
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
                value: file.value
            }))
        }
    ]);
    return filesToStage;
}
