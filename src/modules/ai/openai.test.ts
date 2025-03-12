import { splitDiffIntoChunks, getOpenAIInstance, processGitDiff } from './openai';
import OpenAI from 'openai';
import { getApiKey } from '../config/config';

jest.mock('../config/config');
jest.mock('openai');

describe('AI Operations', () => {
    let mockOpenAI: { chat: { completions: { create: jest.Mock } } };

    beforeEach(() => {
        jest.clearAllMocks();
        mockOpenAI = {
            chat: {
                completions: {
                    create: jest.fn()
                }
            }
        };
        (OpenAI as unknown as jest.Mock).mockImplementation(() => mockOpenAI);
        (getApiKey as jest.Mock).mockResolvedValue('test-api-key');
    });

    describe('splitDiffIntoChunks', () => {
        it('should split diff into chunks based on maxChunkSize', () => {
            const diff = 'line1\nline2\nline3\nline4';
            const maxChunkSize = 11; // Size that will split after "line1\nline2\n"

            const chunks = splitDiffIntoChunks(diff, maxChunkSize);

            expect(chunks).toHaveLength(2);
            expect(chunks[0]).toBe('line1\nline2\n');
            expect(chunks[1]).toBe('line3\nline4\n');
        });

        it('should handle empty diff', () => {
            const chunks = splitDiffIntoChunks('', 1000);
            expect(chunks).toHaveLength(0);
        });

        it('should handle diff smaller than maxChunkSize', () => {
            const diff = 'small diff';
            const chunks = splitDiffIntoChunks(diff, 1000);

            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe('small diff\n');
        });
    });

    describe('getOpenAIInstance', () => {
        it('should create OpenAI instance with API key', async () => {
            const mockApiKey = 'test-api-key';
            (getApiKey as jest.Mock).mockResolvedValueOnce(mockApiKey);

            await getOpenAIInstance();
            expect(OpenAI).toHaveBeenCalledWith({ apiKey: mockApiKey });
        });

        it('should throw error if API key retrieval fails', async () => {
            const error = new Error('API key error');
            (getApiKey as jest.Mock).mockRejectedValueOnce(error);

            await expect(getOpenAIInstance()).rejects.toThrow(error);
        });
    });

    describe('processGitDiff', () => {
        it('should process git diff and return commit groups', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            {
                                type: 'feat',
                                message: 'add new feature',
                                hunks: ['patch1']
                            }
                        ])
                    }
                }]
            };

            mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

            const result = await processGitDiff('test diff');

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                type: 'feat',
                message: 'add new feature',
                hunks: ['patch1']
            });
        });

        it('should handle empty API response', async () => {
            const mockResponse = {
                choices: [{ message: { content: null } }]
            };

            mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

            const result = await processGitDiff('test diff');

            expect(result).toEqual([]);
        });

        it('should handle invalid JSON response', async () => {
            const mockResponse = {
                choices: [{ message: { content: 'invalid json' } }]
            };

            mockOpenAI.chat.completions.create.mockResolvedValueOnce(mockResponse);

            const result = await processGitDiff('test diff');

            expect(result).toEqual([]);
        });

        it('should handle API errors', async () => {
            mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('API error'));

            const result = await processGitDiff('test diff');

            expect(result).toEqual([]);
        });
    });
});
