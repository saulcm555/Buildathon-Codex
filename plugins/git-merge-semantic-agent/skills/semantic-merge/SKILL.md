---
name: semantic-merge
description: Analyze a Git conflict and produce a human-reviewed semantic merge proposal.
---

# Semantic merge

Use `analyze_conflict` first, then `generate_merge_proposal`. Present the proposed code, explanation, confidence, and warnings to the user. Only call `apply_approved_merge` after explicit human approval. Never commit or push changes.
