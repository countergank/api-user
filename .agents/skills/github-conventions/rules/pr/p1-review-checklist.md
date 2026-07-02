---
priority: P1
category: pr
---

# Complete a self-review before requesting review

**Do**: Review your own PR thoroughly before requesting review from others: check that the diff is clean, tests pass, documentation is updated, and the PR follows conventions.
**Avoid**: Requesting review with failing CI, lint errors, debug code left in, or an incomplete PR description.
**Reference**: [Code Review Best Practices](https://google.github.io/eng-practices/review/)

## Self-Review Checklist

Before clicking "Request Review", verify:

### Code Quality
- [ ] No lint errors or warnings
- [ ] No debug statements, `console.log`, or `TODO` comments left behind
- [ ] Code follows project conventions and style guides
- [ ] No unnecessary files committed (lock files, build artifacts, `.DS_Store`)

### Testing
- [ ] All tests pass locally
- [ ] New functionality has corresponding tests
- [ ] Edge cases are covered (null inputs, empty states, error paths)

### Documentation
- [ ] PR description is complete (Summary, Changes, Testing)
- [ ] README or guides updated if user-facing behavior changed
- [ ] Inline comments explain *why*, not *what* (the code shows what)

### Conventions
- [ ] PR title follows `type(scope): description` format
- [ ] Commits follow Conventional Commits format
- [ ] Branch name follows `type/description` convention
- [ ] Related issues are linked with `Closes`/`Fixes`/`Refs`

## Reviewer Expectations

When reviewing someone else's PR:
1. **Read the description first** — understand intent before reading code.
2. **Check the diff** — does the implementation match the stated intent?
3. **Look for edge cases** — error handling, null checks, boundary conditions.
4. **Comment constructively** — explain *why* something should change, not just *what*.
5. **Approve only when satisfied** — request changes if anything blocks merging.

**Examples**:
```
✅ Good: Author ran tests, checked lint, updated docs, and wrote a
         clear PR description before requesting review.
❌ Bad:  PR requested with failing CI, 3 lint errors, and description
         says "pls review".
```
