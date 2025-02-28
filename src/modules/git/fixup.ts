import { execSync } from "child_process";
import inquirer from "inquirer";
import * as log from "cli-block";

/**
 * Checks if there are any changes in the working directory
 * @returns {boolean} True if there are changes, false otherwise
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
 * Gets the current changes in the working directory
 * @returns {string} The git diff stat output
 */
export function getCurrentChanges(): string {
    try {
        return execSync('git diff --stat', { encoding: 'utf-8' }).trim();
    } catch (error) {
        throw new Error(`Failed to get current changes: ${error}`);
    }
}

/**
 * Gets the commit details for a specific commit hash
 * @param {string} commitHash - The hash of the commit
 * @returns {{ hash: string, message: string, date: string, author: string }} Commit details
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
 * Performs the git fixup operation
 * @param {string} commitHash - The hash of the commit to fix up into
 * @returns {boolean} True if the fixup was successful, false otherwise
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
 * Gets the current repository status
 * @returns {string} The current git status output
 */
export function getRepoStatus(): string {
    try {
        return execSync('git status -s', { encoding: 'utf-8' }).trim();
    } catch (error) {
        throw new Error(`Failed to get repository status: ${error}`);
    }
}

/**
 * Main function to handle the fixup process
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
