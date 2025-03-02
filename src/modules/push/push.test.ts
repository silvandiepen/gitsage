import { execSync } from "child_process";
import inquirer from "inquirer";
import { pushBranch } from "../branch/branch";

jest.mock("child_process");
jest.mock("inquirer");

describe("Push Module", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(inquirer, 'prompt').mockImplementation(jest.fn());
    });

    describe("pushBranch", () => {
        it("should push branch successfully", async () => {
            (execSync as jest.Mock)
                .mockReturnValueOnce("current-branch") // git branch --show-current
                .mockReturnValueOnce(""); // git push

            await pushBranch();

            expect(execSync).toHaveBeenCalledWith("git push");
        });

        it("should handle missing upstream branch", async () => {
            (execSync as jest.Mock)
                .mockReturnValueOnce("feature-branch") // git branch --show-current
                .mockImplementationOnce(() => {
                    throw new Error("no upstream branch");
                });

            jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ createUpstream: true });

            await pushBranch();

            expect(execSync).toHaveBeenCalledWith("git push --set-upstream origin feature-branch");
        });

        it("should handle force push scenario", async () => {
            (execSync as jest.Mock)
                .mockReturnValueOnce("feature-branch") // git branch --show-current
                .mockImplementationOnce(() => {
                    throw new Error("would be overwritten by push");
                });

            jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ forcePush: true });

            await pushBranch();

            expect(execSync).toHaveBeenCalledWith("git push --force");
        });

        it("should not force push if user declines", async () => {
            (execSync as jest.Mock)
                .mockReturnValueOnce("feature-branch") // git branch --show-current
                .mockImplementationOnce(() => {
                    throw new Error("would be overwritten by push");
                });

            jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ forcePush: false });

            await pushBranch();

            expect(execSync).not.toHaveBeenCalledWith("git push --force");
        });
    });
});
