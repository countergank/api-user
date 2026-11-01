# Language — Priority P1

Read this file when you choose the language of a ticket field, a branch name or a pull request.

## P1 — Ticket content in the team language, tooling strings in English

The split is by artefact, not by preference: ticket content — title, description, acceptance criteria, comments — is written in the language the team reads, which for this organization is Spanish. Tooling strings stay in English because a tool parses them: the `fixes` keyword, the labels, the board status names and the branch prefix.

Translating a tooling string breaks the automation silently. `arregla #42` is prose, not a closing keyword, so the issue never closes; a Spanish label is a different label and vanishes from every filter built on the English one. Keep the content in one language per team and do not mix: a description that opens in Spanish and continues in English costs the reader two passes.

```text
// ✅ Spanish content, English tooling
Título: Arreglar scroll en navbar móvil
Label: bug, ui
PR: fixes #42
```

```text
// ❌ Translated tooling, or English content for a Spanish team
Título: Fix mobile navbar scroll
Label: error, interfaz
PR: arregla #42
```
