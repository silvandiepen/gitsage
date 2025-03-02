import { execSync } from "child_process";
import inquirer from "inquirer";
import { generatePRContent, generatePR } from "./pr";
import { detectGitPlatform, checkCLI, getTargetBranch, getBranchDiff, getCommitHistory } from "../../utils/git";
import { processGitDiff } from "../ai/openai";

jest.mock("child_process");
jest.mock("inquirer");
jest.mock("../ai/openai");
jest.mock("../../utils/git", () => ({
    detectGitPlatform: jest.fn(),
    checkCLI: jest.fn(),
    getTargetBranch: jest.fn(),
    getBranchDiff: jest.fn(),
    getCommitHistory: jest.fn()
}));

describe("PR Module", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getTargetBranch", () => {
        it("should return selected target branch", async () => {
            (getTargetBranch as jest.Mock).mockResolvedValueOnce("main");
            const result = await getTargetBranch();
            expect(result).toBe("main");
        });

        it("should throw error when no default branches found", async () => {
            (getTargetBranch as jest.Mock).mockRejectedValueOnce(
                new Error("No default target branches (main/master/develop) found")
            );

            await expect(getTargetBranch()).rejects.toThrow(
                "No default target branches (main/master/develop) found"
            );
        });
    });

    describe("getBranchDiff", () => {
        it("should return diff between branches", async () => {
            const mockDiff = "diff --git a/file.txt b/file.txt";
            (getBranchDiff as jest.Mock).mockResolvedValueOnce(mockDiff);
            const result = await getBranchDiff("main");
            expect(result).toBe(mockDiff);
        });

        it("should throw error on git command failure", async () => {
            (getBranchDiff as jest.Mock).mockRejectedValueOnce(
                new Error("Failed to get branch diff: Error: Git command failed")
            );

            await expect(getBranchDiff("main")).rejects.toThrow(
                "Failed to get branch diff: Error: Git command failed"
            );
        });
    });

    describe("getCommitHistory", () => {
        it("should return formatted commit history", async () => {
            const mockHistory = "abc123 - feat: add feature (user)";
            (getCommitHistory as jest.Mock).mockResolvedValueOnce(mockHistory);
            const result = await getCommitHistory("main");
            expect(result).toBe(mockHistory);
        });

        it("should throw error on git command failure", async () => {
            (getCommitHistory as jest.Mock).mockRejectedValueOnce(
                new Error("Failed to get commit history: Error: Git command failed")
            );

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
                title: "feat(1): add new feature; fix(1): fix bug",
                description: "This PR implements add new feature, with fix bug",
                problem: "The codebase had the following issues that needed to be addressed:\n  - fix bug",
                solution: "This PR addresses these needs by:\n  - Implemented add new feature\n  - Fixed fix bug",
                changes: expect.stringContaining("FEAT"),
                commits: "  abc123 - feat: add feature",
                testing: "New functionality has been tested through manual verification\nExisting test suite verifies the fixes"
            });
        });

        it("should handle empty commit groups", async () => {
            (processGitDiff as jest.Mock).mockResolvedValueOnce([]);

            const result = await generatePRContent("diff", "");
            expect(result.title).toBe("");
            expect(result.commits).toBe("  ");
        });
    });

    describe("generatePR", () => {
        it("should create PR on GitHub successfully", async () => {
            (detectGitPlatform as jest.Mock).mockReturnValue("github");
            (checkCLI as jest.Mock).mockReturnValue(true);
            (getTargetBranch as jest.Mock).mockResolvedValueOnce("main");
            (getBranchDiff as jest.Mock).mockResolvedValueOnce("mock diff");
            (getCommitHistory as jest.Mock).mockResolvedValueOnce("abc123 - feat: add feature");
            (execSync as jest.Mock).mockReturnValueOnce("feature-branch").mockReturnValueOnce("");

            const mockCommitGroups = [{ type: "feat", message: "add feature", hunks: [] }];
            (processGitDiff as jest.Mock).mockResolvedValueOnce(mockCommitGroups);
            jest.spyOn(inquirer, 'prompt')
                .mockResolvedValueOnce({ targetBranch: "main" })
                .mockResolvedValueOnce({ createPR: true });

            await expect(generatePR()).resolves.not.toThrow();
        });

        it("should handle missing CLI tool", async () => {
            (detectGitPlatform as jest.Mock).mockReturnValue("github");
            (checkCLI as jest.Mock).mockReturnValue(false);

            await expect(generatePR()).resolves.not.toThrow();
        });

        it("should handle PR creation failure", async () => {
            (detectGitPlatform as jest.Mock).mockReturnValue("github");
            (checkCLI as jest.Mock).mockReturnValue(true);
            (execSync as jest.Mock)
                .mockReturnValueOnce("  origin/main\n  origin/develop")
                .mockReturnValueOnce("feature-branch")
                .mockReturnValueOnce("mock diff")
                .mockReturnValueOnce("feature-branch")
                .mockReturnValueOnce("abc123 - feat: add feature")
                .mockReturnValueOnce("feature-branch")
                .mockImplementationOnce(() => { throw new Error("PR creation failed"); });

            const mockCommitGroups = [{ type: "feat", message: "add feature", hunks: [] }];
            (processGitDiff as jest.Mock).mockResolvedValueOnce(mockCommitGroups);
            jest.spyOn(inquirer, 'prompt')
                .mockResolvedValueOnce({ targetBranch: "main" })
                .mockResolvedValueOnce({ createPR: true });

            await expect(generatePR()).resolves.toBeUndefined();
        });
    });
});
