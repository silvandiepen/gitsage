import OpenAI from "openai";
import { getApiKey } from "../config/config";
import * as log from "cli-block";
import { CommitType } from "../../types/types";

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
            Analyze the Git diff to generate detailed, meaningful commit messages that clearly explain:
            1. What problem or need the changes address
            2. How the changes solve the problem
            3. The technical approach used
            4. Any potential impact on the codebase
            5. The scope and scale of the changes
            6. Any dependencies or related components affected

            Group related changes together and categorize them appropriately.
            Be specific and descriptive in the commit messages.
            Focus on the WHY and HOW, not just the WHAT.
            Avoid generic descriptions like "multiple changes" - instead, provide specific counts and impacts.

            For features:
            - Explain what capability is being added and why it's valuable
            - Describe the implementation approach and any design patterns used
            - Note any configuration or setup requirements

            For fixes:
            - Clearly state the bug or issue being fixed
            - Explain the root cause of the problem
            - Detail how the fix addresses the root cause
            - Mention any preventive measures added

            Your response MUST be a valid JSON array containing objects with the following structure:
            [{
                "type": "feat|fix|chore|docs|style|refactor|perf|test",
                "message": "descriptive commit message explaining the problem and solution",
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

        try {
            const parsedResponse = JSON.parse(aiResponse);
            if (!Array.isArray(parsedResponse)) {
                log.blockLine("⚠️ Response is not an array");
                return [];
            }
            return parsedResponse;
        } catch (parseError) {
            log.blockLine("⚠️ Failed to parse OpenAI response");
            return [];
        }
    } catch (error) {
        log.blockLine("⚠️ OpenAI API call failed");
        return [];
    }
}
