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

## P1 — Link the issue with GitHub keywords and the Linear magic word

Put one keyword per line in the PR description: `Closes #123`, `Fixes #123`, or `Resolves #123` closes the GitHub issue when the PR merges, and `Refs #123` links the issue without closing it. To drive a Linear ticket's state on merge, write the magic word `fixes COU-###` in the PR description; the `COU-###` contract is owned by the linear-tickets skill, so follow it instead of redefining the format here. GitHub keywords and `fixes COU-###` coexist in the same description without conflict.

```text
// ✅ One keyword per line plus the Linear magic word
Closes #42
Fixes #43
Refs #50

fixes COU-240
```

```text
// ❌ Unrecognized phrasing and a missing keyword
This PR should fix issue 42 and update ticket COU-240.
The reviewer must close issue #42 manually after merge.
```
