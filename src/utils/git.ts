import { execSync } from "child_process";
import inquirer from "inquirer";

export type GitPlatform = 'github' | 'bitbucket' | 'unknown';

/**
 * Detects the Git platform (GitHub, Bitbucket) based on the remote URL
 * @returns {GitPlatform} The detected platform
 */
export function detectGitPlatform(): GitPlatform {
    try {
        const remoteUrl = execSync('git remote get-url origin').toString().trim().toLowerCase();
        if (remoteUrl.includes('github.com')) return 'github';
        if (remoteUrl.includes('bitbucket.org')) return 'bitbucket';
        return 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Checks if the CLI tool for the given platform is available
 * @param {GitPlatform} platform - The Git platform to check
 * @returns {boolean} Whether the CLI tool is available
 */
export function checkCLI(platform: GitPlatform): boolean {
    try {
        switch (platform) {
            case 'github':
                execSync('gh --version', { stdio: 'ignore' });
                return true;
            case 'bitbucket':
                execSync('bb --version', { stdio: 'ignore' });
                return true;
            default:
                return false;
        }
    } catch (error) {
        return false;
    }
}

/**
 * Gets the current branch name
 * @returns {string} The current branch name
 */
export function getCurrentBranch(): string {
    return execSync("git branch --show-current").toString().trim();
}

/**
 * Gets the diff between two branches
 * @param {string} targetBranch - The target branch to compare against
 * @returns {string} The git diff output
 */
export async function getBranchDiff(targetBranch: string): Promise<string> {
    try {
        const currentBranch = getCurrentBranch();
        const diff = execSync(`git diff origin/${targetBranch}...${currentBranch}`).toString();
        return diff;
    } catch (error) {
        throw new Error(`Failed to get branch diff: ${error}`);
    }
}

/**
 * Gets the commit history between two branches
 * @param {string} targetBranch - The target branch to get history from
 * @returns {string} The formatted commit history
 */
export async function getCommitHistory(targetBranch: string): Promise<string> {
    try {
        const currentBranch = getCurrentBranch();
        const commits = execSync(
            `git log --pretty=format:"%h - %s (%an)" origin/${targetBranch}..${currentBranch}`
        ).toString();
        return commits;
    } catch (error) {
        throw new Error(`Failed to get commit history: ${error}`);
    }
}

/**
 * Gets the target branch for a pull request
 * @returns {Promise<string>} The selected target branch
 */
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
