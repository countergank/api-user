# Pull Requests — Priority P0–P1

Read this file when you open or update a pull request: its title, its description, and the issues or tickets it links.

## P0 — Give the PR a Conventional title and a filled template

Write the PR title as `type(scope): description`, following the same conventions as a commit subject, and match the dominant commit type when the PR contains multiple commits. Fill every required section of `assets/PULL_REQUEST_TEMPLATE.md` in the description — Summary, Changes, and Testing — and keep the Screenshots section when the PR touches UI. Write each section so a reviewer understands the intent without reading the diff. Keep each PR to a single logical change; if it does two things, split it into two PRs.

```text
// ✅ Conventional title plus every required template section
feat(auth): add google oauth2 login

## Summary
Adds Google OAuth2 sign-in for passwordless users.

## Changes
- auth: new OAuth2 provider and callback route

## Testing
1. Sign in with a Google test account and expect /dashboard.
```

```text
// ❌ Vague title and a description that defers to the diff
fixes and improvements

## Summary
Added OAuth login. See commits for details.

## Testing
N/A
```

## P1 — Link the issue with GitHub keywords

Put one keyword per line in the PR description: `Closes #123`, `Fixes #123`, or `Resolves #123` closes the issue when the PR merges, and `Refs #123` links it without closing. **Caveat:** the keyword only closes the issue when the PR merges into the repo's **default branch**; these repos merge into `develop`, so after merge the agent closes the issue and sets the board `Status: Done` — the `github-tickets` skill owns that contract, so follow it instead of redefining it here.

```text
// ✅ One keyword per line
Closes #42
Fixes #43
Refs #50
```

```text
// ❌ Unrecognized phrasing and a missing keyword
This PR should fix issue 42.
The reviewer must close issue #42 manually after merge.
```
