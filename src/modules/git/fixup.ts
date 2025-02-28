import { execSync } from "child_process";
import inquirer from "inquirer";
import * as log from "cli-block";

/**
 * Checks if there are any uncommitted changes in the working directory.
 * This includes both staged and unstaged changes.
 *
 * @example
 * if (hasChanges()) {
 *   console.log('You have uncommitted changes');
 * }
 *
 * @returns {boolean} True if there are any changes (staged or unstaged), false if working directory is clean
 * @throws {Error} If unable to check git status
 */
export function hasChanges(): boolean {
    try {
        const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
        return status.length > 0;
    } catch (error) {
        throw new Error(`Failed to check git status: ${error}`);
    }
}

/**
 * Retrieves a formatted diff stat of current changes in the working directory.
 * Shows which files have been modified and the number of lines added/removed.
 *
 * @example
 * const changes = getCurrentChanges();
 * console.log('Current modifications:', changes);
 *
 * @returns {string} Formatted git diff stat output showing modified files and line changes
 * @throws {Error} If unable to get git diff information
 */
export function getCurrentChanges(): string {
    try {
        return execSync('git diff --stat', { encoding: 'utf-8' }).trim();
    } catch (error) {
        throw new Error(`Failed to get current changes: ${error}`);
    }
}

/**
 * Retrieves detailed information about a specific commit.
 *
 * @example
 * const details = getCommitDetails('abc123');
 * console.log(`Commit by ${details.author} on ${details.date}`);
 *
 * @param {string} commitHash - The full or shortened hash of the target commit
 * @returns {Object} Commit information
 * @property {string} hash - The commit hash
 * @property {string} message - The commit message
 * @property {string} date - Relative date of the commit (e.g., "2 days ago")
 * @property {string} author - Name of the commit author
 * @throws {Error} If commit hash is invalid or commit details cannot be retrieved
 */
export function getCommitDetails(commitHash: string): { hash: string; message: string; date: string; author: string } {
    try {
        const message = execSync(`git log -n 1 --format=%B ${commitHash}`, { encoding: 'utf-8' }).trim();
        const date = execSync(`git log -n 1 --format=%cd --date=relative ${commitHash}`, { encoding: 'utf-8' }).trim();
        const author = execSync(`git log -n 1 --format=%an ${commitHash}`, { encoding: 'utf-8' }).trim();
        return { hash: commitHash, message, date, author };
    } catch (error) {
        throw new Error(`Failed to get commit details: ${error}`);
    }
}

/**
 * Performs a git fixup operation by creating a fixup commit and automatically rebasing.
 * This function will:
 * 1. Stage all current changes
 * 2. Create a fixup commit targeting the specified commit
 * 3. Perform an interactive rebase to squash the fixup commit
 *
 * @example
 * if (performFixup('abc123')) {
 *   console.log('Fixup successful');
 * } else {
 *   console.log('Fixup failed, manual intervention may be needed');
 * }
 *
 * @param {string} commitHash - Hash of the commit to fix up into
 * @returns {boolean} True if fixup and rebase were successful, false if there were errors or conflicts
 */
export function performFixup(commitHash: string): boolean {
    try {
        // Stage all changes
        execSync('git add .', { encoding: 'utf-8' });

        // Create fixup commit
        execSync(`git commit --fixup ${commitHash}`, { encoding: 'utf-8' });

        // Perform rebase
        execSync(`GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash ${commitHash}^`, { encoding: 'utf-8' });

        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the current repository status in short format.
 * Shows staged, unstaged, and untracked files with their status indicators.
 *
 * @example
 * const status = getRepoStatus();
 * console.log('Current repo status:', status);
 * // Output example:
 * // M  modified.ts   (staged)
 * // ?? newfile.ts   (untracked)
 *
 * @returns {string} Short format git status output
 * @throws {Error} If unable to get repository status
 */
export function getRepoStatus(): string {
    try {
        return execSync('git status -s', { encoding: 'utf-8' }).trim();
    } catch (error) {
        throw new Error(`Failed to get repository status: ${error}`);
    }
}

/**
 * Main function that handles the interactive fixup workflow.
 * Guides the user through the process of:
 * 1. Checking for and reviewing current changes
 * 2. Selecting a target commit
 * 3. Reviewing commit details
 * 4. Confirming and executing the fixup operation
 *
 * @example
 * await fixup();
 *
 * @returns {Promise<void>} Resolves when fixup process is complete
 * @throws {Error} If any git operations fail during the process
 */
export async function fixup(): Promise<void> {
    try {
        log.start('Git Fixup Assistant');
        log.blockHeader('Current Changes');

        // Check for changes
        if (!hasChanges()) {
            log.blockLineWarning('No changes detected in working directory.');
            log.blockLine('Make some changes before running fixup.');
            log.blockFooter();
            return;
        }

        // Show current changes
        const changes = getCurrentChanges();
        log.blockLine(changes);

        // Confirm changes
        const { includeChanges } = await inquirer.prompt([{
            type: 'confirm',
            name: 'includeChanges',
            message: 'Do you want to include these changes in the fixup?',
            default: true
        }]);

        if (!includeChanges) {
            log.blockLineWarning('Fixup cancelled. Stage your changes manually and try again.');
            log.blockFooter();
            return;
        }

        // Get recent commits and prompt for selection
        const gitLog = execSync('git log --oneline --decorate', { encoding: 'utf-8' });
        const { commit } = await inquirer.prompt([{
            type: 'list',
            name: 'commit',
            message: 'Select a commit to fixup into:',
            choices: gitLog.split('\n').map(line => ({
                name: line,
                value: line.split(' ')[0]
            })),
            pageSize: 10
        }]);

        if (!commit) {
            log.blockLineError('No commit selected. Operation cancelled.');
            log.blockFooter();
            return;
        }

        // Show selected commit details
        const commitDetails = getCommitDetails(commit);
        log.blockMid('Selected Commit');
        log.blockRowLine(['Hash', commitDetails.hash]);
        log.blockRowLine(['Author', commitDetails.author]);
        log.blockRowLine(['Date', commitDetails.date]);
        log.blockRowLine(['Message', commitDetails.message]);

        // Final confirmation
        const { confirmed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: 'Are you sure you want to fixup into this commit?',
            default: false
        }]);

        if (!confirmed) {
            log.blockLineWarning('Fixup cancelled.');
            log.blockFooter();
            return;
        }

        // Perform fixup
        log.blockMid('Fixup Process');
        log.blockLine('1/3 Staging all changes...');
        log.blockLine('2/3 Creating fixup commit...');
        log.blockLine('3/3 Rebasing to apply fixup...');

        const success = performFixup(commit);

        if (!success) {
            log.blockLineError('ERROR: Rebase failed.');
            log.blockLine('You may need to resolve conflicts and run \'git rebase --continue\'');
            log.blockFooter();
            return;
        }

        // Show success message and updated status
        log.blockLineSuccess('✓ Fixup completed successfully!');

        // Show the updated commit
        log.blockMid('Updated Commit');
        log.blockLine(execSync(`git log -n 1 --format="%h %ad %an %s" --date=relative ${commit}`, { encoding: 'utf-8' }));

        // Show repository status
        log.blockMid('Repository Status');
        log.blockLine(getRepoStatus());

        log.blockFooter();
    } catch (error) {
        log.blockLineError(`Error: ${error}`);
        log.blockFooter();
        throw error;
    }
}
