---
name: openspec-archive-change
description: Archive a completed change. Use when the user wants to finalize a change after implementation is complete. This triggers the SDD Issues Sync workflow to automatically close linked GitHub issues.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: countergank
  version: "1.1"
---

Archive a completed change.

**CRITICAL: Archive Structure**

This project uses `archive/` as a subdirectory OF the change, not as a separate archive folder:

```
openspec/changes/feature/my-change/
├── archive/
│   └── completed.md      ← This triggers issue closing
├── proposal.md
├── design.md
└── tasks.md
```

**NOT:**
```
openspec/changes/archive/YYYY-MM-DD-my-change/  ← WRONG
```

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes. Use the **AskUserQuestion tool** to let the user select.

   Show only active changes (not already archived - those with `archive/` subdirectory).
   Include the schema used for each change if available.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check artifact completion status**

   Run `openspec status --change "<name>" --json` to check artifact completion.

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - `artifacts`: List of artifacts with their status (`done` or other)

   **If any artifacts are not `done`:**
   - Display warning listing incomplete artifacts
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

3. **Check task completion status**

   Read the tasks file (typically `tasks.md`) to check for incomplete tasks.

   Count tasks marked with `- [ ]` (incomplete) vs `- [x]` (complete).

   **If incomplete tasks found:**
   - Display warning showing count of incomplete tasks
   - Use **AskUserQuestion tool** to confirm user wants to proceed
   - Proceed if user confirms

   **If no tasks file exists:** Proceed without task-related warning.

4. **Create the archive**

   The archive must be inside the change directory:
   ```bash
   mkdir -p openspec/changes/<subdir>/<name>/archive
   ```

   Create `completed.md` with summary:
   ```bash
   cat > openspec/changes/<subdir>/<name>/archive/completed.md << 'EOF'
   # Archived: <name>

   Completed on: YYYY-MM-DD

   ## Summary
   - What was implemented
   - Key decisions made

   ## Files Changed
   - list of main files

   ## Notes
   Any important notes for future reference
   EOF
   ```

5. **Update .openspec.yaml status**

   Update the change's `.openspec.yaml` to mark as archived:
   ```yaml
   status: archived
   archived: YYYY-MM-DD
   ```

6. **Git commit and push**

   ```bash
   git add openspec/changes/<subdir>/<name>/
   git commit -m "docs(openspec): archive completed change <name>"
   git push
   ```

   **IMPORTANT**: Pushing triggers the SDD Issues Sync workflow which automatically closes GitHub issues linked to this change.

7. **Display summary**

   Show archive completion summary including:
   - Change name and location
   - Schema that was used
   - Note about pushing to trigger workflow

**Output On Success**

```
## Archive Complete

**Change:** openspec/changes/feature/<name>/
**Schema:** spec-driven
**Location:** <subdir>/<name>/archive/completed.md
**GitHub Issues:** Will be closed by SDD Issues Sync workflow on push

All artifacts complete. All tasks complete.
```

**Guardrails**
- Always create archive inside the change directory, not in a separate archive folder
- Always push to trigger the SDD Issues Sync workflow
- Don't block archive on warnings - just inform and confirm
- Preserve .openspec.yaml when archiving
- Show clear summary of what happened and that push triggers workflow