# Skill Registry - api-user

## Project Conventions (MANDATORY)

### SDD Workflow Rules

| Rule | Description | Priority |
|------|-------------|----------|
| Feature branch first | Always create `feature/xxx` branch before any SDD work | **CRITICAL** |
| Hybrid = both | engram + openspec are BOTH required, not optional | **CRITICAL** |
| Commits = explicit | Never commit unless user explicitly asks | **CRITICAL** |
| Sub-agents for phases | sdd-explore, sdd-propose, sdd-spec, sdd-design, sdd-tasks, sdd-apply, sdd-verify | **MANDATORY** |

### Git Workflow
1. Create `feature/xxx` branch for new changes
2. Work on feature branch
3. Create PR to merge to develop
4. Wait for explicit approval before merging

### OpenSpec Structure
```
openspec/changes/{type}/{change-name}/
├── proposal.md
├── design.md
├── specs/
│   └── {capability}/spec.md
├── tasks.md
└── archive/
```

### Artifact Store Mode
**Mode**: `hybrid`
- **engram**: Automatic persistence for sub-agents
- **openspec**: File-based artifacts, team-shareable
- **Both**: Required for every change

## Skills

### Project Skills
| Skill | Trigger | File |
|-------|---------|------|
| openspec-explore | /openspec-explore | .opencode/skills/openspec-explore/SKILL.md |
| openspec-propose | /openspec-propose | .opencode/skills/openspec-propose/SKILL.md |
| openspec-apply-change | /openspec-apply | .opencode/skills/openspec-apply-change/SKILL.md |
| openspec-archive-change | /openspec-archive | .opencode/skills/openspec-archive-change/SKILL.md |

### Global Skills
| Skill | Trigger | Location |
|-------|---------|----------|
| sdd-init | /sdd-init | ~/.config/opencode/skills/sdd-init/SKILL.md |
| sdd-explore | /sdd-explore | ~/.config/opencode/skills/sdd-explore/SKILL.md |
| sdd-propose | /sdd-propose | ~/.config/opencode/skills/sdd-propose/SKILL.md |
| sdd-spec | /sdd-spec | ~/.config/opencode/skills/sdd-spec/SKILL.md |
| sdd-design | /sdd-design | ~/.config/opencode/skills/sdd-design/SKILL.md |
| sdd-tasks | /sdd-tasks | ~/.config/opencode/skills/sdd-tasks/SKILL.md |
| sdd-apply | /sdd-apply | ~/.config/opencode/skills/sdd-apply/SKILL.md |
| sdd-verify | /sdd-verify | ~/.config/opencode/skills/sdd-verify/SKILL.md |
| sdd-archive | /sdd-archive | ~/.config/opencode/skills/sdd-archive/SKILL.md |

## Testing
- Framework: Jest
- Command: `npm test`
- CI runs on push (blocked by branch protection on develop)

## Branch Protection
- `develop`: Requires PR, cannot push directly
- `main`: Requires PR with reviews

---
Updated: 2026-04-15
