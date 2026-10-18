---
priority: P1
category: integration
---

# Integración COU-### + fixes COU-###

**Do**: Incluye el identificador `COU-###` en el slug de la rama y usa `fixes COU-###` como keyword en la descripción del PR, para que la automatización de estado de Linear corra sin actualizaciones manuales. Este skill es la FUENTE ÚNICA del contrato.
**Avoid**: Duplicar la definición del contrato `COU-###` en otros skills; inventar formatos de rama/escritura que rompan la automatización de cierre.
**Reference**: `git-environment-flow` y `github-conventions` lo referencian; no lo redefinen. Ver la rama en `rules/branch/p0-branch-naming.md` y el PR en `rules/pr/p1-issue-linking.md` de github-conventions.

## Contrato

1. **Rama**: `type/COU-###-descripcion-kebab` — p. ej., `fix/COU-240-arreglar-scroll`.
2. **PR**: descripción con `fixes COU-###` — p. ej., `fixes COU-240`.
3. **Cierre automático**: al mergear, Linear mueve el ticket a Done sin intervención manual.

## Reglas

1. **Fuente única** — solo `linear-tickets` define `COU-###`; los demás skills referencian.
2. **Keyword exacto** — `fixes` en minúsculas, con el número del ticket.
3. **Coordinado** — rama y PR usan el mismo `COU-###` para que la automatización conecte ambos.

**Ejemplos**:
```
✅ Rama: fix/COU-240-arreglar-scroll
✅ PR:   fixes COU-240
✅ Tras merge, el ticket pasa a Done automáticamente.
❌ Definir el contrato COU-### de nuevo en otro skill.
```
