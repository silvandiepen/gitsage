import { COMMIT_TYPES } from '../../types/types';

/**
 * Extracts branch type and title from a branch name
 * @param {string} branchName - The full branch name
 * @returns {{ type: string | null; title: string }} Branch type and title
 */
export function parseBranchName(branchName: string): { type: string | null; title: string } {
    const parts = branchName.split('/');
    if (parts.length >= 2 && COMMIT_TYPES.includes(parts[0].toLowerCase())) {
        return {
            type: parts[0].toLowerCase(),
            title: parts.slice(1).join('/')
        };
    }
    return {
        type: null,
        title: branchName
    };
}

export { createBranch, checkoutBranch, getBranchInfo } from './branch-manager';
export { pushBranch } from '../push/push';
