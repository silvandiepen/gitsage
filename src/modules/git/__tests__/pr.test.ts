import { execSync } from "child_process";
import inquirer from "inquirer";
import { getTargetBranch, getBranchDiff, getCommitHistory, generatePRContent } from "../pr";
import { processGitDiff } from "../../ai/openai";

jest.mock("child_process");
jest.mock("inquirer");
jest.mock("../../ai/openai");

describe("PR Module", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getTargetBranch", () => {
        it("should return selected target branch", async () => {
            const mockBranches = "  origin/main\n  origin/develop";
            (execSync as jest.Mock).mockReturnValueOnce(mockBranches);
            jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ targetBranch: "main" });

            const result = await getTargetBranch();
            expect(result).toBe("main");
        });

        it("should throw error when no default branches found", async () => {
            (execSync as jest.Mock).mockReturnValueOnce("  origin/feature/test");

            await expect(getTargetBranch()).rejects.toThrow(
                "No default target branches (main/master/develop) found"
            );
        });
    });

    describe("getBranchDiff", () => {
        it("should return diff between branches", async () => {
            const mockDiff = "diff --git a/file.txt b/file.txt";
            (execSync as jest.Mock)
                .mockReturnValueOnce("feature-branch") // current branch
                .mockReturnValueOnce(mockDiff); // diff

            const result = await getBranchDiff("main");
            expect(result).toBe(mockDiff);
        });

        it("should throw error on git command failure", async () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error("Git command failed");
            });

            await expect(getBranchDiff("main")).rejects.toThrow(
                "Failed to get branch diff: Error: Git command failed"
            );
        });
    });

    describe("getCommitHistory", () => {
        it("should return formatted commit history", async () => {
            const mockHistory = "abc123 - feat: add feature (user)";
            (execSync as jest.Mock)
                .mockReturnValueOnce("feature-branch") // current branch
                .mockReturnValueOnce(mockHistory); // commit history

            const result = await getCommitHistory("main");
            expect(result).toBe(mockHistory);
        });

        it("should throw error on git command failure", async () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error("Git command failed");
            });

            await expect(getCommitHistory("main")).rejects.toThrow(
                "Failed to get commit history: Error: Git command failed"
            );
        });
    });

    describe("generatePRContent", () => {
        it("should generate PR content from diff and commits", async () => {
            const mockCommitGroups = [
                { type: "feat", message: "add new feature", hunks: [] },
                { type: "fix", message: "fix bug", hunks: [] }
            ];
            (processGitDiff as jest.Mock).mockResolvedValueOnce(mockCommitGroups);

            const diff = "mock diff content";
            const commits = "abc123 - feat: add feature";
            const result = await generatePRContent(diff, commits);

            expect(result).toEqual({
                title: "add new feature",
                description: "This PR implements add new feature",
                problem: "Detailed problem description will be generated from commit messages",
                solution: "Solution overview will be generated from commit changes",
                changes: expect.stringContaining("FEAT"),
                commits: "abc123 - feat: add feature",
                testing: "Testing details will be extracted from test-related changes"
            });
        });

        it("should handle empty commit groups", async () => {
            (processGitDiff as jest.Mock).mockResolvedValueOnce([]);

            const result = await generatePRContent("diff", "");
            expect(result.title).toBe("Update branch");
            expect(result.commits).toBe("No commits found");
        });
    });
});
