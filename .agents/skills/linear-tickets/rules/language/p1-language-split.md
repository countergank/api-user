---
priority: P1
category: language
---

# Split de idioma: contenido ES / tooling EN

**Do**: Escribe el contenido del ticket (título, descripción, criterios de aceptación) en español y mantén en inglés las cadenas de tooling: `fixes`, prefijos de rama, labels y nombres de estado.
**Avoid**: Traducir el tooling (`arregla COU-042`, labels en español) o escribir el contenido del ticket en inglés cuando el equipo trabaja en español.
**Reference**: `../labels/p0-label-set.md` — labels en inglés; `../integration/p1-github-integration.md` — keywords como `fixes`.

## Reglas

1. **Contenido en español** — título, contexto, scope, criterios y descripción.
2. **Tooling en inglés** — `fixes COU-###`, labels (`bug`/`feature`/`spike`/`chore`, `api`/`ui`/`docs`/`infra`), nombres de estado y prefijos de rama (`feat/`, `fix/`).
3. **Consistencia** — la integración automática (cierre de ticket por `fixes`) solo funciona con el keyword en inglés.

**Ejemplos**:
```
✅ Título: Arreglar scroll en navbar móvil   (contenido ES)
✅ Label: bug, ui                            (tooling EN)
✅ PR: fixes COU-042                          (tooling EN)
❌ fixes → "arregla" o label → "error"
```
