# OpenSpec Directory Structure

## CRITICAL: Always Use Subdirectories

**NEVER** create changes in root `openspec/changes/<name>/`

**ALWAYS** use the correct subdirectory based on branch type:

```
openspec/changes/
├── feature/          ← feature/xxx branches
├── bugfix/          ← bugfix/xxx branches
├── hotfix/          ← hotfix/xxx branches
├── release/          ← release/xxx branches
├── chore/           ← chore/xxx branches
└── specs/           ← global shared specs
```

## Branch Type → Subdirectory Mapping

| Branch | Subdirectory |
|--------|-------------|
| `feature/xxx` | `feature/` |
| `bugfix/xxx` | `bugfix/` |
| `hotfix/xxx` | `hotfix/` |
| `release/xxx` | `release/` |
| `chore/xxx` | `chore/` |

## Example

For branch `feature/swagger-skill`:
```
openspec/changes/feature/swagger-skill/
├── .openspec.yaml
├── proposal.md
├── design.md
├── specs/
│   └── {capability}/spec.md
├── tasks.md
└── archive/
```

## Verification

After creating a change:
```bash
git mv openspec/changes/<name> openspec/changes/<subdir>/<name>
```

Verify: `ls openspec/changes/<subdir>/<name>/` should show `.openspec.yaml`

## References
- Full specification: `.opencode/skills/openspec-propose/SKILL.md`
- Project skill-registry: `.atl/skill-registry.md`