# AGENTS.md — api-user

Instructions for AI agents and human contributors working in this repository.

## Read first

- `.agents/skills/` — installed skills; load the matching `SKILL.md` before working in that area.
- `skills-lock.json` — pinned skill versions and hashes.
- `.atl/skill-registry.md` — index of installed skills.

## Commits

- **No `git commit` without an explicit authorization for that exact commit**, given by a
  human in this session after seeing the diff. "Let's work on X", an approved plan, or an
  authorized ODD feature does not authorize any commit.
- Before asking: show `git status --short` and `git diff --stat`, state the exact message,
  then stop and wait for a yes.
- Never chain `git commit` with other commands; never `--amend`, `--no-verify` or `-a`
  without authorization.
- If a commit lands without authorization, report it immediately. Do not amend or hide it.

`.husky/pre-commit` enforces the rule: it rejects every commit unless `GIT_COMMIT_APPROVED=1`
is set. Set that variable only on the exact command that executes an explicit human yes; never
set it to get past the question.

## Skills

Skill behavior comes from `countergank/skills`. Refresh an installed copy with
`npx skills update <skill> -y`, and commit the copies together with `skills-lock.json`.
