import { parseBranchName } from "./branch";

describe("Branch Module", () => {
    describe("parseBranchName", () => {
        it("should parse branch name with valid type", () => {
            const result = parseBranchName("feat/new-ui");
            expect(result).toEqual({
                type: "feat",
                title: "new-ui"
            });
        });

        it("should handle branch name without type", () => {
            const result = parseBranchName("new-ui");
            expect(result).toEqual({
                type: null,
                title: "new-ui"
            });
        });

        it("should handle branch name with invalid type", () => {
            const result = parseBranchName("invalid-type/new-feature");
            expect(result).toEqual({
                type: null,
                title: "invalid-type/new-feature"
            });
        });

        it("should handle branch name with multiple path segments", () => {
            const result = parseBranchName("feat/ui/new-button");
            expect(result).toEqual({
                type: "feat",
                title: "ui/new-button"
            });
        });

        it("should convert type to lowercase", () => {
            const result = parseBranchName("FEAT/new-ui");
            expect(result).toEqual({
                type: "feat",
                title: "new-ui"
            });
        });
    });
});
