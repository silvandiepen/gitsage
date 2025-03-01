import { execSync } from "child_process";
import inquirer from "inquirer";
import * as log from "cli-block";
import { COMMIT_TYPES } from '../../types/types';
import { parseBranchName } from './branch';

/**
 * Creates a new branch with proper type prefix
 * @param {string} branchTitle - The branch title
 * @param {string} [type] - Optional branch type
 */
export async function createBranch(branchTitle: string, type?: string): Promise<void> {
    try {
        let branchType = type;

        // If no type is provided, prompt user to select one
        if (!branchType) {
            const { selectedType } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'selectedType',
                    message: 'Select branch type:',
                    choices: COMMIT_TYPES
                }
            ]);
            branchType = selectedType;
        }

        const branchName = `${branchType}/${branchTitle}`;

        try {
            // Check if branch exists locally
            execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
            log.blockLineError(`Branch already exists: ${branchName}`);
            throw new Error(`Branch ${branchName} already exists`);
        } catch (error: any) {
            if (error.message.includes('already exists')) throw error;
            // Branch doesn't exist locally, create it
            log.blockLineSuccess(`Creating new branch: ${branchName}`);
            execSync(`git checkout -b ${branchName}`);
        }
    } catch (error) {
        log.blockLineError(`Failed to create branch: ${error}`);
        throw error;
    }
}

/**
 * Lists all branches and allows user to select one to load
 * @param {string} [branchName] - Optional specific branch to load
 * @param {string} [type] - Optional branch type
 */
export async function checkoutBranch(branchName?: string, type?: string): Promise<void> {
    try {
        if (branchName) {
            // If type is provided, create a new branch with type prefix
            if (type) {
                await createBranch(branchName, type);
                return;
            }

            // Check if branch exists
            try {
                execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
                execSync(`git checkout ${branchName}`);
                log.blockLineSuccess(`Switched to branch: ${branchName}`);
            } catch {
                log.blockLineError(`Branch not found: ${branchName}`);
                throw new Error(`Branch ${branchName} not found`);
            }
        } else {
            // Get all branches sorted by committerdate
            const branches = execSync('git for-each-ref --sort=-committerdate refs/heads/ --format="%(refname:short)"')
                .toString()
                .trim()
                .split('\n');

            const { selectedBranch } = await inquirer.prompt({
                type: 'list',
                name: 'selectedBranch',
                message: 'Search and select a branch to load:',
                choices: branches.filter(branch => branch),
                pageSize: 10,
                loop: false
            });

            execSync(`git checkout ${selectedBranch}`);
            log.blockLineSuccess(`Switched to branch: ${selectedBranch}`);
        }
    } catch (error) {
        log.blockLineError(`Failed to load branch: ${error}`);
        throw error;
    }
}

/**
 * Gets information about a branch
 * @param {string} [branchName] - Optional branch name, defaults to current branch
 * @returns {Promise<void>}
 */
export async function getBranchInfo(branchName?: string): Promise<void> {
    try {
        const targetBranch = branchName || execSync('git branch --show-current').toString().trim();

        try {
            execSync(`git show-ref --verify --quiet refs/heads/${targetBranch}`);

            const lastCommit = execSync(`git log ${targetBranch} -1 --format="%h - %s (%cr)"`).toString().trim();
            const author = execSync(`git log ${targetBranch} -1 --format="%an <%ae>"`).toString().trim();
            const created = execSync(`git log ${targetBranch} --format="%cr" --reverse | head -1`).toString().trim();
            const { type, title } = parseBranchName(targetBranch);

            log.blockLine();
            log.blockHeader('Branch Information');
            log.blockLine(`Name: ${targetBranch}`);
            log.blockLine(`Type: ${type || 'N/A'}`);
            log.blockLine(`Title: ${title}`);
            log.blockLine(`Created: ${created}`);
            log.blockLine(`Author: ${author}`);
            log.blockLine(`Last Commit: ${lastCommit}`);
            log.blockLine();

        } catch {
            log.blockLineError(`Branch not found: ${targetBranch}`);
            throw new Error(`Branch ${targetBranch} not found`);
        }
    } catch (error) {
        log.blockLineError(`Failed to get branch info: ${error}`);
        throw error;
    }
}
