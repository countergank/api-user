---
name: code-comments
description: "Trigger: code comments, JSDoc, doc comments, docstrings, TODO comments, file header, comment policy, reviewing comments, comentarios en el código, comentarios JSDoc, documentar código, documentar funciones. Sets the standard for every comment in code: self-sufficient code carries no comments, and JSDoc fires only for nesting or a hidden effect. Apply it whenever writing, editing, or reviewing any JS, TS, Go, Python, or YAML file — never skip it because the file looks clean."
license: MIT
metadata:
  author: countergank
  version: "1.0.0"
---

## When to Apply

Activate whenever writing, editing, or reviewing comments, JSDoc, docstrings, or doc comments in source code.

## Rules

| Rule file | Scope |
|-----------|-------|
| `rules/comments.md` | When a comment is allowed: nesting or a hidden effect, nothing else |
| `rules/jsdoc.md` | JSDoc block contents and type matching with the signature |
| `rules/languages.md` | Same threshold for Go, Python, and YAML |

Self-sufficient code carries no comments; no signal, no JSDoc. Length alone is not complexity.
