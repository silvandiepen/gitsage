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
    const MAX_CHUNK_LENGTH = 10000;
    const diffChunks = splitDiffIntoChunks(diff, MAX_CHUNK_LENGTH);

    log.start("Git Commit Analysis");
    log.blockHeader("Processing Git Changes");
    log.blockLine(`Found ${diffChunks.length} chunks to analyze`);

    const messages = [{
        role: "system",
        content: `
            You are an expert in Git and software development.
            Analyze the Git diff to generate concise, meaningful, and specific commit messages.
            Focus on creating a clear narrative that explains:

            1. The specific technical changes made (e.g., "Implemented JWT authentication", not "Updated authentication")
            2. The concrete business value or technical improvement (e.g., "Reduced API response time by 40%")
            3. The scope of impact (e.g., "Refactored user authentication flow across all API endpoints")

            Guidelines for generating commit messages:
            - Be specific and quantitative where possible (e.g., "Reduced bundle size by 25%" vs "Optimized bundle size")
            - Focus on the technical substance, not just the category of change
            - Avoid generic terms like "multiple updates", "various changes", or "improvements"
            - Include specific numbers, percentages, or metrics when relevant
            - Mention specific technologies, patterns, or standards being implemented

            For features:
            - Name the specific feature or capability being added
            - Mention the key technical components or patterns used
            - Include any performance or scalability characteristics

            For fixes:
            - Name the specific bug or issue being fixed
            - Mention the root cause if relevant
            - Include any performance impact of the fix

            Your response MUST be a valid JSON array containing objects with the following structure:
            [{
                "type": "feat|fix|chore|docs|style|refactor|perf|test",
                "message": "descriptive commit message explaining the specific changes",
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
            const errorMessage = parseError instanceof Error ? parseError.message : 'Invalid JSON response';
            log.blockLine("⚠️ Failed to parse OpenAI response: " + errorMessage);

            // Log the raw response before parsing
            log.blockMid("Raw AI Response");
            log.blockJson(aiResponse);

            return [];
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log.blockLine(`⚠️ OpenAI API call failed: ${errorMessage}`);
        if (error instanceof OpenAI.APIError) {
            log.blockLine(`Status: ${error.status}`);
            log.blockLine(`Type: ${error.type}`);
            if (error.code) log.blockLine(`Code: ${error.code}`);
        }
        return [];
    }
}
