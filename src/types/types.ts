/**
 * Available commit types for conventional commits
 */
export const COMMIT_TYPES = [
    'feat',     // A new feature
    'fix',      // A bug fix
    'docs',     // Documentation only changes
    'style',    // Changes that do not affect the meaning of the code
    'refactor', // A code change that neither fixes a bug nor adds a feature
    'perf',     // A code change that improves performance
    'test',     // Adding missing tests or correcting existing tests
    'build',    // Changes that affect the build system or external dependencies
    'ci',       // Changes to our CI configuration files and scripts
    'chore',    // Other changes that don't modify src or test files
    'revert'    // Reverts a previous commit
];

/**
 * Alternative names that map to standard commit types
 */
export const COMMIT_TYPE_ALIASES: Record<string, CommitType> = {
    'feature': 'feat',      // Alternative for feat
    'bugfix': 'fix',        // Alternative for fix
    'documentation': 'docs', // Alternative for docs
    'performance': 'perf',   // Alternative for perf
};

/**
 * Type representing valid commit types
 */
export type CommitType = typeof COMMIT_TYPES[number];
