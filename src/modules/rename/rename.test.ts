import { getCommitMessage, getHeadCommit, renameCommit } from './rename';
import { execSync } from 'child_process';
import inquirer, { Answers } from 'inquirer';
import * as log from 'cli-block';

jest.mock('child_process');
jest.mock('inquirer');
jest.mock('cli-block');

describe('Git Rename Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (execSync as jest.Mock).mockReset();
    (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>).mockImplementation(jest.fn());
  });

  describe('getCommitMessage', () => {
    it('should return commit message for given hash', () => {
      const mockMessage = 'feat: test commit message';
      (execSync as jest.Mock).mockReturnValue(mockMessage);

      const result = getCommitMessage('abc123');
      expect(result).toBe(mockMessage);
      expect(execSync).toHaveBeenCalledWith(
        'git log -n 1 --format=%B abc123',
        { encoding: 'utf-8' }
      );
    });

    it('should throw error when commit hash is invalid', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid commit hash');
      });

      expect(() => getCommitMessage('invalid')).toThrow('Failed to get commit message: Error: Invalid commit hash');
    });
  });

  describe('getHeadCommit', () => {
    it('should return current HEAD commit hash', () => {
      const mockHash = 'abc123';
      (execSync as jest.Mock).mockReturnValue(mockHash);

      const result = getHeadCommit();
      expect(result).toBe(mockHash);
      expect(execSync).toHaveBeenCalledWith(
        'git rev-parse HEAD',
        { encoding: 'utf-8' }
      );
    });

    it('should throw error when not in a git repository', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      expect(() => getHeadCommit()).toThrow('Failed to get HEAD commit: Error: Not a git repository');
    });
  });

  describe('renameCommit', () => {
    it('should prevent rename when there are staged changes', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('staged-file.txt') // git diff --staged --name-only
        .mockReturnValueOnce(''); // git diff --name-only

      await renameCommit();

      expect(log.start).toHaveBeenCalledWith('Commit Message Rename');
      expect(log.blockHeader).toHaveBeenCalledWith('Cannot Proceed');
      expect(log.blockLine).toHaveBeenCalledWith('There are uncommitted changes in your working directory.');
      expect(log.blockLine).toHaveBeenCalledWith('To rename a commit, your working directory must be clean.');
      expect(log.blockMid).toHaveBeenCalledWith('Suggested Actions');
      expect(log.blockLine).toHaveBeenCalledWith('1. Commit your changes');
      expect(log.blockLine).toHaveBeenCalledWith('2. Stash your changes using: git stash');
      expect(log.blockLine).toHaveBeenCalledWith('3. Discard your changes using: git reset --hard');
      expect(log.blockMid).toHaveBeenCalledWith('Suggested Actions');
      expect(log.blockLine).toHaveBeenCalledWith('1. Commit your changes');
      expect(log.blockLine).toHaveBeenCalledWith('2. Stash your changes using: git stash');
      expect(log.blockLine).toHaveBeenCalledWith('3. Discard your changes using: git reset --hard');
    });

    it('should prevent rename when there are unstaged changes', async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('modified-file.txt'); // git diff --name-only

      await renameCommit();

      expect(log.start).toHaveBeenCalledWith('Commit Message Rename');
      expect(log.blockHeader).toHaveBeenCalledWith('Cannot Proceed');
      expect(log.blockLine).toHaveBeenCalledWith('There are uncommitted changes in your working directory.');
      expect(log.blockLine).toHaveBeenCalledWith('To rename a commit, your working directory must be clean.');
      expect(log.blockMid).toHaveBeenCalledWith('Suggested Actions');
      expect(log.blockLine).toHaveBeenCalledWith('1. Commit your changes');
      expect(log.blockLine).toHaveBeenCalledWith('2. Stash your changes using: git stash');
      expect(log.blockLine).toHaveBeenCalledWith('3. Discard your changes using: git reset --hard');
      expect(log.blockMid).toHaveBeenCalledWith('Suggested Actions');
      expect(log.blockLine).toHaveBeenCalledWith('1. Commit your changes');
      expect(log.blockLine).toHaveBeenCalledWith('2. Stash your changes using: git stash');
      expect(log.blockLine).toHaveBeenCalledWith('3. Discard your changes using: git reset --hard');
    });
    it('should rename the most recent commit', async () => {
      const mockHash = 'abc123';
      const oldMessage = 'feat: old message';
      const commitType = 'feat';
      const messageContent = 'new message';
      const newMessage = 'feat: new message';
      const mockGitLog = 'abc123 feat: old message';

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog) // git log --oneline --decorate --no-color
        .mockReturnValueOnce(oldMessage) // git log -n 1 --format=%B
        .mockReturnValueOnce(mockHash) // git rev-parse HEAD
        .mockReturnValueOnce('') // git commit --amend
        .mockReturnValueOnce('git log output'); // final git log

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: mockHash })
        .mockResolvedValueOnce({ commitType })
        .mockResolvedValueOnce({ messageContent })
        .mockResolvedValueOnce({ confirmed: true });

      await renameCommit();

      const amendCommand = (execSync as jest.Mock).mock.calls.find((call: string[]) => call[0].includes('git commit --amend'));
      expect(amendCommand[0]).toBe(`git commit --amend -m "${newMessage}"`);
      expect(amendCommand[1]).toEqual({ encoding: 'utf-8' });
    });

    it('should rename commit without commit type when none selected', async () => {
      const mockHash = 'abc123';
      const oldMessage = 'feat: old message';
      const messageContent = 'simple message';
      const mockGitLog = 'abc123 feat: old message';

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog) // git log --oneline --decorate --no-color
        .mockReturnValueOnce(oldMessage) // git log -n 1 --format=%B
        .mockReturnValueOnce(mockHash) // git rev-parse HEAD
        .mockReturnValueOnce('') // git commit --amend
        .mockReturnValueOnce('git log output'); // final git log

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: mockHash })
        .mockResolvedValueOnce({ commitType: '' })
        .mockResolvedValueOnce({ messageContent })
        .mockResolvedValueOnce({ confirmed: true });

      await renameCommit();

      const amendCommand = (execSync as jest.Mock).mock.calls.find((call: string[]) => call[0].includes('git commit --amend'));
      expect(amendCommand[0]).toBe(`git commit --amend -m "${messageContent}"`);
      expect(amendCommand[1]).toEqual({ encoding: 'utf-8' });
    });

    it('should rename an older commit using rebase', async () => {
      const mockHash = 'abc123';
      const oldMessage = 'feat: old message';
      const commitType = 'feat';
      const messageContent = 'new feature';
      const newMessage = 'feat: new feature';
      const mockGitLog = 'abc123 feat: old message';

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog) // git log --oneline --decorate --no-color
        .mockReturnValueOnce(oldMessage) // git log -n 1 --format=%B
        .mockReturnValueOnce('def456') // git rev-parse HEAD (different from selected commit)
        .mockReturnValueOnce('') // git rebase
        .mockReturnValueOnce('git log output'); // final git log

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: mockHash })
        .mockResolvedValueOnce({ commitType })
        .mockResolvedValueOnce({ messageContent })
        .mockResolvedValueOnce({ confirmed: true });

      await renameCommit();

      expect(execSync).toHaveBeenNthCalledWith(6,
        `git filter-branch -f --msg-filter 'if [ \"$GIT_COMMIT\" = \"abc123\" ]; then echo \"feat: new feature\"; else cat; fi' abc123^..HEAD`,
        { encoding: 'utf-8' }
      );
    });

    it('should handle user cancellation', async () => {
      const mockHash = 'abc123';
      const oldMessage = 'feat: old message';
      const mockGitLog = 'abc123 feat: old message';

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog) // git log --oneline --decorate --no-color
        .mockReturnValueOnce(oldMessage); // git log -n 1 --format=%B

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: mockHash })
        .mockResolvedValueOnce({ commitType: 'feat' })
        .mockResolvedValueOnce({ messageContent: 'new message' })
        .mockResolvedValueOnce({ confirmed: false });

      await renameCommit();

      expect(log.blockLineWarning).toHaveBeenCalledWith('Operation cancelled.');
    });

    it('should handle no commit selected', async () => {
      const mockGitLog = 'abc123 feat: old message';
      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog); // git log --oneline --decorate --no-color

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: '' });

      await renameCommit();

      expect(log.blockLineError).toHaveBeenCalledWith('No commit selected.');
    });

    it('should handle execution errors', async () => {
      const mockHash = 'abc123';
      const oldMessage = 'feat: old message';
      const mockGitLog = 'abc123 feat: old message';

      (execSync as jest.Mock)
        .mockReturnValueOnce('') // git diff --staged --name-only
        .mockReturnValueOnce('') // git diff --name-only
        .mockReturnValueOnce(mockGitLog) // git log --oneline --decorate --no-color
        .mockReturnValueOnce(oldMessage) // git log -n 1 --format=%B
        .mockReturnValueOnce(mockHash) // git rev-parse HEAD
        .mockImplementationOnce(() => {
          throw new Error('Git error');
        }); // git commit --amend throws error

      (inquirer.prompt as unknown as jest.Mock<Promise<Answers>>)
        .mockResolvedValueOnce({ commit: mockHash })
        .mockResolvedValueOnce({ commitType: 'feat' })
        .mockResolvedValueOnce({ messageContent: 'new message' })
        .mockResolvedValueOnce({ confirmed: true });

      await expect(renameCommit()).rejects.toThrow('Git error');
      expect(execSync).toHaveBeenCalledTimes(6);
    });
  });
});
