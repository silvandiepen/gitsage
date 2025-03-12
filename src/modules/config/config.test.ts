import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getConfig, getApiKey, configureSettings } from './config';
import inquirer from 'inquirer';

jest.mock('fs');
jest.mock('child_process');
jest.mock('inquirer');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;

describe('Config Module', () => {
  const TEST_CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.gitsage');
  const TEST_CONFIG_FILE = path.join(TEST_CONFIG_DIR, 'config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReset();
    mockFs.readFileSync.mockReset();
    mockFs.writeFileSync.mockReset();
    mockFs.mkdirSync.mockReset();
  });

  describe('getConfig', () => {
    it('should return default config when config file does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      const config = await getConfig();
      expect(config).toEqual({
        apiKey: '',
        aiProvider: 'OpenAI',
        gitName: '',
        gitEmail: ''
      });
    });

    it('should return merged config when config file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        apiKey: 'test-key',
        gitName: 'Test User'
      }));

      const config = await getConfig();
      expect(config).toEqual({
        apiKey: 'test-key',
        aiProvider: 'OpenAI',
        gitName: 'Test User',
        gitEmail: ''
      });
    });
  });

  describe('getApiKey', () => {
    it('should return existing API key from config', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        apiKey: 'existing-key'
      }));

      const apiKey = await getApiKey();
      expect(apiKey).toBe('existing-key');
      expect(mockInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt for API key when not configured', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockInquirer.prompt.mockResolvedValue({ apiKey: 'new-key' });

      const apiKey = await getApiKey();
      expect(apiKey).toBe('new-key');
      expect(mockInquirer.prompt).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('configureSettings', () => {
    beforeEach(() => {
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === 'git config --global user.name') return 'Git User';
        if (cmd === 'git config --global user.email') return 'git@user.com';
        return '';
      });
    });

    it('should display current settings when view action is selected', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        apiKey: 'test-key',
        aiProvider: 'OpenAI',
        gitName: 'Test User',
        gitEmail: 'test@user.com'
      }));

      mockInquirer.prompt.mockResolvedValueOnce({ action: 'view' });

      const consoleSpy = jest.spyOn(console, 'log');
      await configureSettings();

      expect(consoleSpy).toHaveBeenCalledWith('\nCurrent Settings:');
      expect(consoleSpy).toHaveBeenCalledWith('AI Provider:', 'OpenAI');
      expect(consoleSpy).toHaveBeenCalledWith('OpenAI API Key:', '*****');
      expect(consoleSpy).toHaveBeenCalledWith('Git Name:', 'Test User');
      expect(consoleSpy).toHaveBeenCalledWith('Git Email:', 'test@user.com');

      consoleSpy.mockRestore();
    });

    it('should update settings when edit action is selected', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        apiKey: 'old-key',
        aiProvider: 'OpenAI'
      }));

      mockInquirer.prompt
        .mockResolvedValueOnce({ action: 'edit' })
        .mockResolvedValueOnce({ field: 'apiKey' })
        .mockResolvedValueOnce({ action: 'new' })
        .mockResolvedValueOnce({ key: 'new-key' });

      await configureSettings();

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        TEST_CONFIG_FILE,
        expect.stringContaining('new-key'),
        expect.any(Object)
      );
    });
  });
});
