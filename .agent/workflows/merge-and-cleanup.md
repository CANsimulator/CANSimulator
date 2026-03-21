---
description: Merge the recent feature branch into main and delete it
---

This workflow guides you through merging your completed feature branch into `main` and cleaning up the workspace by deleting the merged branch.

> [!CAUTION]
> Ensure all your changes are committed and pushed before running this workflow.

# Commands

1. **Verify the current branch**
// turbo
`git branch --show-current`

2. **Checkout the main branch**
// turbo
`git checkout main`

3. **Merge the feature branch**
Note: Replace the branch name if it has changed.
// turbo
`git merge fix/bus-topology-font-readability-42-17559`

4. **Delete the merged feature branch**
// turbo
`git branch -d fix/bus-topology-font-readability-42-17559`
