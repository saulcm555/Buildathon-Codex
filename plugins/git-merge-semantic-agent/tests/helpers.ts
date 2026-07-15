import type { ConflictAnalysis } from "../src/domain/ConflictAnalysis.js";

export const analysisFixture: ConflictAnalysis = {
  conflict: {
    repositoryPath: "C:/repo",
    filePath: "src/example.ts",
    language: "typescript",
    base: "const value = 1;",
    ours: "const renamedValue = 1;",
    theirs: "if (value < 0) throw new Error('negative');\nconst value = 1;",
    originalHash: "abc123",
    commits: {
      base: { hash: "base", author: "A", date: "2026-01-01", message: "base" },
      ours: { hash: "ours", author: "B", date: "2026-01-02", message: "rename" },
      theirs: { hash: "theirs", author: "C", date: "2026-01-03", message: "validate" }
    }
  },
  astChanges: [{ kind: "rename", summary: "value renamed to renamedValue" }]
};
