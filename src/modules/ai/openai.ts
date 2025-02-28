import OpenAI from "openai";
import { getApiKey } from "../../config";
import * as log from "cli-block";
import { CommitType } from "../git/types";

/**
 * Initializes and returns an OpenAI API instance with the configured API key
 * @returns {Promise<OpenAI>} A configured OpenAI client instance
 */
export async function getOpenAIInstance(): Promise<OpenAI> {
    const apiKey = await getApiKey();
    return new OpenAI({ apiKey });
}

/**
 * Splits a large Git diff into smaller chunks for processing
 * @param {string} diff - The complete Git diff to split
 * @param {number} maxChunkSize - Maximum size of each chunk in characters
 * @returns {string[]} Array of diff chunks
 */
export function splitDiffIntoChunks(diff: string, maxChunkSize: number): string[] {
    const lines = diff.split("\n");
    let chunks: string[] = [];
    let currentChunk = "";

    for (const line of lines) {
        if ((currentChunk.length + line.length) > maxChunkSize) {
            chunks.push(currentChunk);
            currentChunk = "";
        }
        currentChunk += line + "\n";
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk);
    }

    return chunks;
}

/**
 * Processes Git diff using OpenAI to generate structured commit messages
 * @param {string} diff - The Git diff to analyze
 * @returns {Promise<Array<{type: CommitType, message: string, hunks: string[]}>>} Array of commit suggestions
 * @throws {Error} When OpenAI API call fails
 */
export async function processGitDiff(diff: string): Promise<Array<{ type: CommitType; message: string; hunks: string[] }>> {
    const openai = await getOpenAIInstance();
    const MAX_CHUNK_LENGTH = 4000;
    const diffChunks = splitDiffIntoChunks(diff, MAX_CHUNK_LENGTH);

    log.start("Git Commit Analysis");
    log.blockHeader("Processing Git Changes");
    log.blockLine(`Found ${diffChunks.length} chunks to analyze`);

    const messages = [{
        role: "system",
        content: `
            You are an expert in Git and software development.
            I will send you the complete Git diff in multiple messages.
            Do NOT respond yet—just acknowledge receipt.
            Once I send 'END_OF_DIFF', analyze all received changes together
            and generate meaningful commit messages, grouping related changes together.

            IMPORTANT: Your response MUST be a valid JSON array containing objects with the following structure:
            [{
                "type": "feat|fix|chore|docs|style|refactor|perf|test",
                "message": "descriptive commit message",
                "hunks": ["patch content"]
            }]
            `
    }];

    log.blockMid("Sending Changes to AI");
    for (const chunk of diffChunks) {
        log.blockLine(`Processing chunk (${chunk.length} chars)`);
        messages.push({ role: "user", content: chunk });
    }

    messages.push({
        role: "user",
        content: "END_OF_DIFF. Now generate structured commit messages for the full diff.",
    });

    try {
        log.blockMid("Analyzing Changes");
        log.blockLine("Waiting for AI analysis...");
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: messages.map(msg => ({
                role: msg.role as "system" | "user" | "assistant",
                content: msg.content
            })),
            temperature: 0.2
        });
        log.blockLine("AI analysis complete");

        const aiResponse = response.choices[0].message.content;
        if (!aiResponse) {
            log.blockLine("⚠️ Empty response from OpenAI API");
            return [];
        }

        let commitGroups;
        try {
            commitGroups = JSON.parse(aiResponse);
        } catch (parseError: unknown) {
            if (parseError instanceof Error) {
                log.blockLine("⚠️ Failed to parse AI response as JSON: " + parseError.message);
            } else {
                log.blockLine("⚠️ Failed to parse AI response as JSON");
            }
            return [];
        }

        if (!Array.isArray(commitGroups)) {
            log.blockLine("⚠️ Invalid response format: expected an array");
            return [];
        }

        // Validate each commit group
        const validCommitGroups = commitGroups.filter(group => {
            if (!group || typeof group !== 'object') {
                log.blockLine("⚠️ Invalid commit group format: expected an object");
                return false;
            }

            const validTypes = ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test'];
            if (!group.type || !validTypes.includes(group.type)) {
                log.blockLine(`⚠️ Invalid commit type: ${group.type}`);
                return false;
            }

            if (!group.message || typeof group.message !== 'string') {
                log.blockLine("⚠️ Invalid commit message format");
                return false;
            }

            if (!Array.isArray(group.hunks)) {
                log.blockLine("⚠️ Invalid hunks format: expected an array");
                return false;
            }

            return true;
        });

        if (validCommitGroups.length > 0) {
            log.blockMid("Generated Commit Messages");
            validCommitGroups.forEach(group => {
                log.blockRowLine([group.type, group.message]);
            });
        }

        log.blockFooter();
        return validCommitGroups;
    } catch (error) {
        log.blockLine("⚠️ OpenAI API error: " + error);
        log.blockFooter();
        return [];
    }
}
