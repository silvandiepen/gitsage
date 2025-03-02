import { execSync } from "child_process";
import inquirer from "inquirer";
import * as log from "cli-block";

/**
 * Pushes the current branch to remote, handling force push and upstream creation
 */
export async function pushBranch(): Promise<void> {
    try {
        const currentBranch = execSync('git branch --show-current').toString().trim();

        try {
            // Try normal push first
            execSync('git push');
            log.blockHeader('Push');
            log.blockLineSuccess(`Successfully pushed branch: ${currentBranch}`);
        } catch (error) {
            const errorMsg = (error as Error).toString();

            if (errorMsg.includes('no upstream branch')) {
                // Handle missing upstream
                const { createUpstream } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'createUpstream',
                        message: `Branch ${currentBranch} has no upstream. Create and push?`,
                        default: true
                    }
                ]);

                if (createUpstream) {
                    execSync(`git push --set-upstream origin ${currentBranch}`);
                    log.blockLineSuccess(`Created upstream and pushed branch: ${currentBranch}`);
                }
            } else if (errorMsg.includes('would be overwritten by push')) {
                // Handle force push scenario
                const { forcePush } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'forcePush',
                        message: 'Remote branch has diverged. Force push?',
                        default: false
                    }
                ]);

                if (forcePush) {
                    execSync('git push --force');
                    log.blockLineSuccess(`Force pushed branch: ${currentBranch}`);
                }
            } else {
                // Other error
                throw error;
            }
        }
    } catch (error) {
        log.blockLineError(`Failed to push branch: ${error}`);
        throw error;
    }
    log.blockFooter()
}
