import type { ConflictAnalysis } from "../domain/ConflictAnalysis.js";
import type { MergeProposal } from "../domain/MergeProposal.js";
import type { MergeWorkflowPort } from "../application/MergeWorkflowPort.js";

/** Public, read-only fixture used by the deployed hackathon demo. */
export class DemoWorkflow implements MergeWorkflowPort {
  async analyze(repositoryPath: string, filePath: string): Promise<ConflictAnalysis> {
    if (repositoryPath !== "demo://semantic-merge" || filePath !== "src/services/payment.ts") {
      throw new Error("The public demo only accepts its built-in conflict fixture.");
    }
    return {
      conflict: {
        repositoryPath, filePath, language: "typescript", originalHash: "public-demo-read-only",
        base: "export async function charge(total: number) {\n  return gateway.charge({ total });\n}",
        ours: "export async function charge(total: number) {\n  if (total <= 0) throw new Error('Invalid total');\n  return gateway.charge({ total });\n}",
        theirs: "export async function charge(amount: number) {\n  return gateway.charge({ amount });\n}",
        commits: {
          base: { hash: "c1a8d2e", author: "Ana Ruiz", date: "2026-07-12", message: "feat: create payment flow" },
          ours: { hash: "93fbea1", author: "Demo branch", date: "2026-07-14", message: "feat: validate amount" },
          theirs: { hash: "d72a4bf", author: "Diego Vega", date: "2026-07-14", message: "refactor: rename total" }
        }
      },
      astChanges: [
        { branch: "ours", kind: "validation", summary: "Added a non-positive amount validation." },
        { branch: "theirs", kind: "rename", summary: "Renamed parameter total to amount." }
      ]
    };
  }

  async apply(_: { analysis: ConflictAnalysis; proposal: MergeProposal; mergedCode: string }): Promise<void> {
    // Public deployments must never write to a visitor's filesystem or repository.
  }
}
