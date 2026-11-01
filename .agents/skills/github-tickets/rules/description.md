# Description — Priority P0

Read this file when you write or edit a ticket description.

## P0 — Structure the description as Context → Scope → Acceptance criteria

A description holds three blocks in this order. Context says why the ticket exists and which problem it solves, in two or three sentences. Scope says what is included and what is explicitly out of it. Acceptance criteria are checklist bullets that describe verifiable behaviour and its edge cases, so the person who reads the ticket without talking to you can deliver it.

Write each criterion as an observable outcome rather than a ceremony: a bullet that a reviewer can mark done or not done. Do not use Given/When/Then; the structure already carries the intent and the ceremony costs tokens the reader pays for twice. Keep the Estimate, the board status and the assignee out of the prose, because they are GitHub fields and a copy in the text is the copy that goes stale. The description is ticket content, so it follows the content language set by `rules/language.md`, while ids, labels and keywords stay in English.

```text
// ✅ Context, scope boundary and verifiable criteria
Contexto: El scroll del navbar móvil se atasca con JS deshabilitado.
Scope: Solo navbar móvil. Fuera: tablet y desktop.
- [ ] El scroll funciona sin JavaScript.
- [ ] Sin zoom accidental en iOS al hacer scroll.
- [ ] No rompe el menú hamburguesa existente.
```

```text
// ❌ Given/When/Then ceremony, and fields copied into the prose
Given el navbar móvil, When el usuario hace scroll, Then no se atasca.
Estimate: 3 · Status: In Progress · Asignado: Leandro
```
