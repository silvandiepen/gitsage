import { execSync } from 'child_process';
import { hasChanges, getCurrentChanges, getCommitDetails, performFixup, getRepoStatus } from './fixup';

jest.mock('child_process');

describe('Git Fixup Operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('hasChanges', () => {
        it('should return true when there are changes', () => {
            (execSync as jest.Mock).mockReturnValue(' M file1.ts\n');
            expect(hasChanges()).toBe(true);
            expect(execSync).toHaveBeenCalledWith('git status --porcelain', { encoding: 'utf-8' });
        });

        it('should return false when there are no changes', () => {
            (execSync as jest.Mock).mockReturnValue('');
            expect(hasChanges()).toBe(false);
        });

        it('should throw error when git command fails', () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Git command failed');
            });
            expect(() => hasChanges()).toThrow('Failed to check git status');
        });
    });

    describe('getCurrentChanges', () => {
        it('should return git diff stat output', () => {
            const mockDiff = 'file1.ts | 2 +-\nfile2.ts | 4 ++--';
            (execSync as jest.Mock).mockReturnValue(` ${mockDiff}`);
            expect(getCurrentChanges()).toBe(mockDiff);
            expect(execSync).toHaveBeenCalledWith('git diff --stat', { encoding: 'utf-8' });
        });

        it('should throw error when git command fails', () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Git command failed');
            });
            expect(() => getCurrentChanges()).toThrow('Failed to get current changes');
        });
    });

    describe('getCommitDetails', () => {
        const mockCommitHash = 'abc123';

        it('should return commit details', () => {
            (execSync as jest.Mock)
                .mockReturnValueOnce('Test commit message\n')
                .mockReturnValueOnce('2 days ago\n')
                .mockReturnValueOnce('John Doe\n');

            const result = getCommitDetails(mockCommitHash);
            expect(result).toEqual({
                hash: mockCommitHash,
                message: 'Test commit message',
                date: '2 days ago',
                author: 'John Doe'
            });
        });

        it('should throw error when git command fails', () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Git command failed');
            });
            expect(() => getCommitDetails(mockCommitHash)).toThrow('Failed to get commit details');
        });
    });

    describe('performFixup', () => {
        const mockCommitHash = 'abc123';

        it('should return true when fixup is successful', () => {
            (execSync as jest.Mock).mockReturnValue('');
            expect(performFixup(mockCommitHash)).toBe(true);
            expect(execSync).toHaveBeenCalledTimes(3);
            expect(execSync).toHaveBeenCalledWith('git add .', { encoding: 'utf-8' });
            expect(execSync).toHaveBeenCalledWith(`git commit --fixup ${mockCommitHash}`, { encoding: 'utf-8' });
            expect(execSync).toHaveBeenCalledWith(`GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash ${mockCommitHash}^`, { encoding: 'utf-8' });
        });

        it('should return false when fixup fails', () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Git command failed');
            });
            expect(performFixup(mockCommitHash)).toBe(false);
        });
    });

    describe('getRepoStatus', () => {
        it('should return git status output', () => {
            const mockStatus = 'M file1.ts\nA file2.ts';
            (execSync as jest.Mock).mockReturnValue(` ${mockStatus}`);
            expect(getRepoStatus()).toBe(mockStatus);
            expect(execSync).toHaveBeenCalledWith('git status -s', { encoding: 'utf-8' });
        });

        it('should throw error when git command fails', () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error('Git command failed');
            });
            expect(() => getRepoStatus()).toThrow('Failed to get repository status');
        });
    });
});
