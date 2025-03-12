import { execSync } from "child_process";
import inquirer from "inquirer";
import * as log from "cli-block";
import { stripAnsiCodes } from "../../utils";
import { COMMIT_TYPES } from "../../types";
import * as fs from "fs";

/**
 * Gets the commit message for a specific commit hash
 * @param {string} commitHash - The hash of the commit
 * @returns {string} The commit message
 */
export function getCommitMessage(commitHash: string): string {
    try {
        return execSync(`git log -n 1 --format=%B ${commitHash}`, { encoding: "utf-8" }).trim();
    } catch (error) {
        throw new Error(`Failed to get commit message: ${error}`);
    }
}

/**
 * Gets the most recent commit hash
 * @returns {string} The hash of the most recent commit
 */
export function getHeadCommit(): string {
    try {
        return execSync('git rev-parse HEAD', { encoding: "utf-8" }).trim();
    } catch (error) {
        throw new Error(`Failed to get HEAD commit: ${error}`);
    }
}

/**
 * Prompts user to select a commit from the git log
 * @returns {Promise<string>} The selected commit hash
 */
async function selectCommit(): Promise<string> {
    try {
        // Get git log without colors for processing
        const gitLog = execSync('git log --oneline --decorate --no-color', { encoding: "utf-8" });
        const { commit } = await inquirer.prompt([{
            type: 'list',
            name: 'commit',
            message: 'Select a commit to rename:',
            choices: gitLog.split('\n').map(line => ({
                name: line,
                value: line.split(' ')[0]
            })),
            pageSize: 10
        }]);
        return commit;
    } catch (error) {
        throw new Error(`Failed to get git log: ${error}`);
    }
}

/**
 * Renames a commit message
 * @param {string} commitHash - Optional commit hash to rename
 */
export async function renameCommit(commitHash?: string): Promise<void> {
    try {
        // Check for staged or unstaged changes
        const stagedChanges = execSync('git diff --staged --name-only', { encoding: "utf-8" }).trim();
        const unstagedChanges = execSync('git diff --name-only', { encoding: "utf-8" }).trim();

        if (stagedChanges || unstagedChanges) {
            log.start('Commit Message Rename');
            log.blockHeader('Cannot Proceed');
            log.blockLine('There are uncommitted changes in your working directory.');
            log.blockLine('To rename a commit, your working directory must be clean.');
            log.blockMid('Suggested Actions');
            log.blockLine('1. Commit your changes');
            log.blockLine('2. Stash your changes using: git stash');
            log.blockLine('3. Discard your changes using: git reset --hard');
            log.blockFooter();
            return;
        }

        // Get commit hash either from parameter or user selection
        const displayCommit = commitHash || await selectCommit();
        const cleanCommit = stripAnsiCodes(displayCommit);

        if (!cleanCommit) {
            log.blockLineError('No commit selected.');
            return;
        }

        // Get current commit message
        const currentMessage = getCommitMessage(cleanCommit);

        // Display current commit message
        log.start('Commit Message Rename');
        log.blockHeader('Current Commit Message');
        log.blockLine(currentMessage);

        // Select commit type
        const { commitType } = await inquirer.prompt([{
            type: 'list',
            name: 'commitType',
            message: 'Select commit type:',
            choices: COMMIT_TYPES,
            pageSize: COMMIT_TYPES.length
        }]);

        // Get new commit message
        const { messageContent } = await inquirer.prompt([{
            type: 'input',
            name: 'messageContent',
            message: 'Enter commit message:',
            validate: (input: string) => input.trim().length > 0 || 'Commit message cannot be empty'
        }]);

        // Construct the full commit message
        const newMessage = commitType ? `${commitType}: ${messageContent}` : messageContent;

        // Show summary and get confirmation
        log.blockMid('Rename Summary');
        log.blockRowLine(['Commit Hash', displayCommit]); // Use colored hash for display
        log.blockRowLine(['Old Message', currentMessage]);
        log.blockRowLine(['New Message', newMessage]);

        const { confirmed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: 'Are you sure you want to proceed?',
            default: true
        }]);

        if (!confirmed) {
            log.blockLineWarning('Operation cancelled.');
            log.blockFooter();
            return;
        }

        // Check if it's the most recent commit
        const headCommit = getHeadCommit();
        if (cleanCommit === headCommit) {
            // For the most recent commit, use git commit --amend
            log.blockMid('Renaming Commit');
            log.blockLine('Renaming the most recent commit...');
            execSync(`git commit --amend -m "${newMessage}"`, { encoding: "utf-8" });
            log.blockLineSuccess('Most recent commit renamed successfully!');
        } else {
            // For older commits, use filter-branch
            log.blockMid('Renaming Commit');
            log.blockLine('Renaming an older commit...');
            execSync(`git filter-branch -f --msg-filter 'if [ "$GIT_COMMIT" = "${cleanCommit}" ]; then echo "${newMessage}"; else cat; fi' ${cleanCommit}^..HEAD`, { encoding: "utf-8" });
            log.blockLineSuccess('Commit renamed successfully!');
        }

        // Show updated git log
        log.blockMid('Updated Git Log');
        log.blockLine(execSync('git log -n 3 --oneline --decorate --color=always', { encoding: "utf-8" }));
        log.blockFooter();

    } catch (error) {
        log.blockLineError(`Error: ${error}`);
        log.blockFooter();
        throw error;
    }
}
