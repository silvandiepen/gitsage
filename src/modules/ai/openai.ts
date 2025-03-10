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
            Your task is to analyze a Git diff and generate structured commit messages along with corresponding Git patch hunks.

            **For each commit, return:**
            - A commit **type** (feat, fix, chore, docs, style, refactor, perf, test).
            - A **concise, meaningful commit message**.
            - A list of **valid Git patch hunks** (formatted as proper \`git diff --git\` patches).

            ---
            ### **⚠️ IMPORTANT REQUIREMENTS**
            1️⃣ **Each hunk MUST be a complete, valid Git patch** that can be directly applied using:
            \`\`\`sh
            git apply --cached
            \`\`\`
            2️⃣ **Each hunk MUST start with**:
            \`\`\`diff
            diff --git a/{filepath} b/{filepath}
            \`\`\`
            3️⃣ **Each hunk MUST include:**
               - The correct file path.
               - A valid \`index\` hash.
               - A properly formatted hunk header (\`@@ -X,Y +A,B @@\`).
               - The **full code change** in Git diff format.
            4️⃣ **DO NOT return plain code snippets**—only **fully valid Git patches**.
            5️⃣ **DO NOT escape newlines (\\n) inside hunks.** Return hunks as **normal multi-line JSON strings**.
            6️⃣ **DO NOT add extra formatting, JSON should be valid as-is.**

            ---
            ### ✅ **Example Valid JSON Response**
            \`\`\`json
            [
                {
                    "type": "refactor",
                    "message": "Refactored authentication module to improve maintainability",
                    "hunks": [
                        "diff --git a/src/auth.ts b/src/auth.ts\nindex abc123..def456 100644\n--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -10,7 +10,7 @@ export function authenticateUser() {\n- console.log('Authenticating user...');\n+ console.info('User authentication in progress');"
                    ]
                },
                {
                    "type": "fix",
                    "message": "Fixed incorrect import path in index.ts",
                    "hunks": [
                        "diff --git a/src/index.ts b/src/index.ts\nindex 789abc..123def 100644\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -2,1 +2,1 @@\n-import oldModule from './oldLocation';\n+import newModule from './newLocation';"
                    ]
                }
            ]
            \`\`\`

            ---
            **Return only a valid JSON array formatted like the example above.** Do not include extra explanations, markdown, or escaped characters.`
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
            model: "gpt-4o-mini",
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
