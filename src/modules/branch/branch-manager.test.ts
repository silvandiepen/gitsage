import { execSync } from "child_process";
import inquirer from "inquirer";
import { checkoutBranch } from "./branch";

jest.mock("child_process");
jest.mock("inquirer");

describe("Checkout Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(inquirer, 'prompt').mockImplementation(jest.fn());
  });

  describe("checkoutBranch", () => {
    it("should checkout existing branch", async () => {
      (execSync as jest.Mock)
        .mockReturnValueOnce("") // git show-ref check
        .mockReturnValueOnce(""); // git checkout

      await checkoutBranch("existing-branch");

      expect(execSync).toHaveBeenCalledWith("git checkout existing-branch");
    });

    it("should list and checkout selected branch when no branch name provided", async () => {
      const branches = ["branch1", "branch2", "branch3"];
      (execSync as jest.Mock)
        .mockReturnValueOnce(branches.join("\n")); // git for-each-ref

      jest.spyOn(inquirer, 'prompt').mockResolvedValueOnce({ selectedBranch: "branch2" });

      await checkoutBranch();

      expect(inquirer.prompt).toHaveBeenCalledWith({
        type: "list",
        name: "selectedBranch",
        message: "Search and select a branch to load:",
        choices: branches.filter(branch => branch),
        loop: false,
        pageSize: 10
      });

      expect(execSync).toHaveBeenCalledWith("git checkout branch2");
    });

    it("should throw error when branch does not exist", async () => {
      (execSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error();
      });

      await expect(checkoutBranch("non-existing-branch"))
        .rejects
        .toThrow("Branch non-existing-branch not found");
    });
  });
});
