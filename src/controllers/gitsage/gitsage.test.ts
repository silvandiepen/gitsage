import { analyzeAndCommit } from './gitsage';
import { getUnstagedFiles, getUntrackedFiles, getStagedFiles, stageFiles, createCommit, promptFileSelection } from '../../modules/commit';
import { processGitDiff } from '../../modules/ai/openai';
import inquirer from 'inquirer';

jest.mock('../../modules/commit');
jest.mock('../../modules/ai/openai');
jest.mock('inquirer');

describe('GitSage Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        console.log = jest.fn();
    });

    describe('analyzeAndCommit', () => {
        it('should handle no changes scenario', async () => {
            (getStagedFiles as jest.Mock).mockReturnValue({ files: [], diff: '' });
            (getUnstagedFiles as jest.Mock).mockReturnValue([]);
            (getUntrackedFiles as jest.Mock).mockReturnValue([]);

            await analyzeAndCommit();

            expect(console.log).toHaveBeenCalledWith('No changes detected.');
            expect(processGitDiff).not.toHaveBeenCalled();
        });

        it('should handle staged changes and create commits', async () => {
            const mockStagedFiles = ['M file1.ts', 'D file2.ts'];
            const mockDiff = 'test diff content';
            (getStagedFiles as jest.Mock).mockReturnValue({
                files: mockStagedFiles,
                diff: mockDiff
            });

            const mockCommitGroups = [
                { type: 'feat', message: 'new feature', hunks: ['patch1'] },
                { type: 'fix', message: 'bug fix', hunks: ['patch2'] }
            ];
            (processGitDiff as jest.Mock).mockResolvedValue(mockCommitGroups);
            (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({ confirmCommit: true });

            await analyzeAndCommit();

            expect(processGitDiff).toHaveBeenCalledWith(mockDiff);
            expect(createCommit).toHaveBeenCalledTimes(2);
            expect(createCommit).toHaveBeenCalledWith('feat' as const, 'new feature');
            expect(createCommit).toHaveBeenCalledWith('fix' as const, 'bug fix');
        });

        it('should handle unstaged files selection and staging', async () => {
            (getStagedFiles as jest.Mock)
                .mockReturnValueOnce({ files: [], diff: '' })
                .mockReturnValueOnce({ files: ['M file1.ts'], diff: 'updated diff' });

            const mockUnstagedFiles = [{ name: 'file1.ts', value: 'file1.ts', status: 'M' }];
            (getUnstagedFiles as jest.Mock).mockReturnValue(mockUnstagedFiles);
            (getUntrackedFiles as jest.Mock).mockReturnValue([]);
            (promptFileSelection as jest.Mock).mockResolvedValue(['file1.ts']);
            (processGitDiff as jest.Mock).mockResolvedValue([{
                type: 'feat',
                message: 'new feature',
                hunks: ['patch1']
            }]);
            (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({ confirmCommit: true });

            await analyzeAndCommit();

            expect(stageFiles).toHaveBeenCalledWith(['file1.ts']);
            expect(processGitDiff).toHaveBeenCalledWith('updated diff');
            expect(createCommit).toHaveBeenCalledWith('feat' as const, 'new feature');
        });

        it('should abort when user declines commit confirmation', async () => {
            (getStagedFiles as jest.Mock).mockReturnValue({
                files: ['M file1.ts'],
                diff: 'test diff'
            });
            (processGitDiff as jest.Mock).mockResolvedValue([{
                type: 'feat',
                message: 'new feature',
                hunks: ['patch1']
            }]);
            (inquirer.prompt as unknown as jest.Mock).mockResolvedValue({ confirmCommit: false });

            await analyzeAndCommit();

            expect(createCommit).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('❌ Commit process aborted by user.');
        });

        it('should handle empty AI response', async () => {
            (getStagedFiles as jest.Mock).mockReturnValue({
                files: ['M file1.ts'],
                diff: 'test diff'
            });
            (processGitDiff as jest.Mock).mockResolvedValue([]);

            await analyzeAndCommit();

            expect(inquirer.prompt).not.toHaveBeenCalled();
            expect(createCommit).not.toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith('⚠️ AI did not generate any commit messages. Aborting.');
        });
    });
});
