import { execSync } from "child_process";
import inquirer from "inquirer";
import { detectGitPlatform, checkCLI, getCurrentBranch, getBranchDiff, getCommitHistory, getTargetBranch } from "./git";

jest.mock("child_process");
jest.mock("inquirer");

describe("Git Utilities", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("detectGitPlatform", () => {
        it("should detect GitHub platform", () => {
            (execSync as jest.Mock).mockReturnValueOnce("https://github.com/user/repo.git");
            expect(detectGitPlatform()).toBe("github");
        });

        it("should detect Bitbucket platform", () => {
            (execSync as jest.Mock).mockReturnValueOnce("https://bitbucket.org/user/repo.git");
            expect(detectGitPlatform()).toBe("bitbucket");
        });

        it("should return unknown for other platforms", () => {
            (execSync as jest.Mock).mockReturnValueOnce("https://gitlab.com/user/repo.git");
            expect(detectGitPlatform()).toBe("unknown");
        });

        it("should return unknown when git command fails", () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error("Git command failed");
            });
            expect(detectGitPlatform()).toBe("unknown");
        });
    });

    describe("checkCLI", () => {
        it("should return true for GitHub CLI when available", () => {
            (execSync as jest.Mock).mockImplementation(() => "");
            expect(checkCLI("github")).toBe(true);
        });

        it("should return true for Bitbucket CLI when available", () => {
            (execSync as jest.Mock).mockImplementation(() => "");
            expect(checkCLI("bitbucket")).toBe(true);
        });

        it("should return false when CLI is not available", () => {
            (execSync as jest.Mock).mockImplementation(() => {
                throw new Error("Command not found");
            });
            expect(checkCLI("github")).toBe(false);
            expect(checkCLI("bitbucket")).toBe(false);
        });

        it("should return false for unknown platform", () => {
            expect(checkCLI("unknown")).toBe(false);
        });
    });

    describe("getCurrentBranch", () => {
        it("should return current branch name", () => {
            (execSync as jest.Mock).mockReturnValueOnce("feature/test-branch\n");
            expect(getCurrentBranch()).toBe("feature/test-branch");
        });
    });

    describe("getTargetBranch", () => {
        it("should return selected target branch", async () => {
            (execSync as jest.Mock).mockReturnValueOnce("  origin/main\n  origin/develop");
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
});
