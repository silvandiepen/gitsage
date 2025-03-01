import inquirer from "inquirer";
import { createBranch, checkoutBranch, getBranchInfo } from "../../modules/branch/branch";

/**
 * Interactive branch management command
 * Provides options to create, checkout, or get info about branches
 */
export async function branchCommand(): Promise<void> {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: 'Create a new branch', value: 'create' },
                { name: 'Checkout existing branch', value: 'checkout' },
                { name: 'Get branch information', value: 'info' }
            ]
        }
    ]);

    switch (action) {
        case 'create':
            const { branchTitle } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'branchTitle',
                    message: 'Enter the branch name:',
                    validate: (input: string) => input.length > 0 || 'Branch name is required'
                }
            ]);
            await createBranch(branchTitle);
            break;

        case 'checkout':
            await checkoutBranch();
            break;

        case 'info':
            await getBranchInfo();
            break;
    }
}
