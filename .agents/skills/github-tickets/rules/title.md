# Title — Priority P0

Read this file when you write or rename a ticket title.

## P0 — Write the title as [Verb] [What] [Context]

Every title carries three segments in this order, so the board reads as a list of actions and each ticket is unique at a glance without opening it.

| Segment | What it holds | Example |
|---------|---------------|---------|
| `[Verb]` | Imperative verb | `Arreglar`, `Añadir`, `Mejorar` |
| `[What]` | Object of the change | `scroll en navbar`, `login con OAuth2` |
| `[Context]` | Where or when it applies | `móvil`, `en checkout`, `admin` |

The verb comes first. A noun phrase without one (`scroll navbar`) names a topic rather than a ticket, and two tickets on the same topic become indistinguishable on the board. The context is what separates a fix in the mobile navbar from the same fix on desktop, so a title that omits it is unique only by accident. Keep the title short enough to read on one board line: no proper names, no internal acronyms, and no issue number the board already shows. The title is ticket content, so it follows the content language set by `rules/language.md`, not the language of this file.

```text
// ✅ Imperative verb, object and context
Arreglar scroll en navbar móvil
Añadir login con OAuth2
Mejorar validación de email en registro
```

```text
// ❌ No verb, or an issue number where the context belongs
scroll navbar
Fix del bug #42
varias cosas a la vez
```
