import { z } from "zod";

export const MergeProposalSchema = z.object({
  mergedCode: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.number().min(0).max(1),
  warnings: z.array(z.string())
});

export type MergeProposal = z.infer<typeof MergeProposalSchema>;

export interface StoredMergeProposal extends MergeProposal {
  id: string;
  conflictId: string;
  createdAt: string;
}
