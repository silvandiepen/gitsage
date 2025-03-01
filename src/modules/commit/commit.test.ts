import { runCommand, getFileStatusEmoji, getUnstagedFiles, getUntrackedFiles, getStagedFiles, stageFiles, createCommit } from './commit';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('Git Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runCommand', () => {
    it('should execute shell command and return trimmed output', () => {
      const mockOutput = '  test output  \n';
      (execSync as jest.Mock).mockReturnValue(mockOutput);

      const result = runCommand('git status');
      expect(result).toBe('test output');
      expect(execSync).toHaveBeenCalledWith('git status', { encoding: 'utf-8' });
    });

    it('should return empty string on error', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = runCommand('invalid-command');
      expect(result).toBe('');
    });
  });

  describe('getFileStatusEmoji', () => {
    it('should return correct emoji for modified files', () => {
      expect(getFileStatusEmoji('M')).toBe('📝');
    });

    it('should return correct emoji for deleted files', () => {
      expect(getFileStatusEmoji('D')).toBe('🗑️');
    });

    it('should return correct emoji for untracked files', () => {
      expect(getFileStatusEmoji('U')).toBe('➕');
    });

    it('should return question mark emoji for unknown status', () => {
      expect(getFileStatusEmoji('X')).toBe('❓');
    });
  });

  describe('getUnstagedFiles', () => {
    it('should return array of unstaged file objects', () => {
      const mockDiff = 'M file1.ts\nD file2.ts';
      (execSync as jest.Mock).mockReturnValue(mockDiff);

      const result = getUnstagedFiles();
      expect(result).toEqual([
        { name: 'file1.ts', value: 'file1.ts', status: 'M' },
        { name: 'file2.ts', value: 'file2.ts', status: 'D' }
      ]);
    });
  });

  describe('getUntrackedFiles', () => {
    it('should return array of untracked file objects', () => {
      const mockOutput = 'file1.ts\nfile2.ts';
      (execSync as jest.Mock).mockReturnValue(mockOutput);

      const result = getUntrackedFiles();
      expect(result).toEqual([
        { name: 'file1.ts', value: 'file1.ts', status: 'U' },
        { name: 'file2.ts', value: 'file2.ts', status: 'U' }
      ]);
    });
  });

  describe('getStagedFiles', () => {
    it('should return staged files and diff', () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce('M file1.ts\nD file2.ts')
        .mockReturnValueOnce('diff content');

      const result = getStagedFiles();
      expect(result).toEqual({
        files: ['M file1.ts', 'D file2.ts'],
        diff: 'diff content'
      });
    });
  });

  describe('stageFiles', () => {
    it('should stage each file', () => {
      const files = ['file1.ts', 'file2.ts'];
      stageFiles(files);

      expect(execSync).toHaveBeenCalledTimes(2);
      expect(execSync).toHaveBeenCalledWith('git add "file1.ts"', { encoding: 'utf-8' });
      expect(execSync).toHaveBeenCalledWith('git add "file2.ts"', { encoding: 'utf-8' });
    });
  });

  describe('createCommit', () => {
    it('should create a commit with type and message', () => {
      createCommit('feat', 'add new feature');

      expect(execSync).toHaveBeenCalledWith(
        'git commit -m "feat: add new feature"',
        { encoding: 'utf-8' }
      );
    });
  });
});
