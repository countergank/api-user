---
priority: P0
category: labels
---

# Set de labels (tipos + componentes)

**Do**: Usa el set de labels confirmado en singular e inglés: tipos `bug`/`feature`/`spike`/`chore` y componentes `api`/`ui`/`docs`/`infra`. Aplica un tipo y al menos un componente por ticket.
**Avoid**: Replicar estado en labels (p. ej., `done`/`in-progress`), plurales inconsistentes, o inventar labels fuera del set sin aprobación.
**Reference**: `../templates/p1-per-type-templates.md` — qué label acompaña a cada plantilla.

## Etiquetas

**Tipos** (cualidad del trabajo):

| Label | Uso |
|-------|-----|
| `bug` | Corrección de comportamiento roto |
| `feature` | Nueva capacidad visible |
| `spike` | Investigación/enmarcado de entregable |
| `chore` | Mantenimiento, tooling, config |

**Componentes** (área afectada):

| Label | Uso |
|-------|-----|
| `api` | Backend / endpoints |
| `ui` | Interfaz / frontend |
| `docs` | Documentación |
| `infra` | Infraestructura / CI-CD |

## Reglas

1. **Singular** — nunca pluralizar (`bugs`, `features`).
2. **Sin estado** — el estado lo gestiona Linear (workflow), no los labels.
3. **Composición** — un ticket lleva un tipo + al menos un componente.
4. **Inglés** — labels en inglés (ver LT-05).

**Ejemplos**:
```
✅ bug + ui
✅ feature + api
✅ chore + infra
❌ "done", "in-progress"           ← estado, no label
❌ "bugs" / "varios"               ← plural o vago
```
