---
priority: P1
category: integration
---

# Integración `branchName` + `fixes COU-###`

**Do**: Usa como rama el campo `branchName` que devuelve Linear, tal cual, y `fixes COU-###` como keyword en la descripción del PR, para que la automatización de estado de Linear corra sin actualizaciones manuales. Este skill es la FUENTE ÚNICA del contrato.
**Avoid**: Duplicar la definición del contrato `COU-###` en otros skills; componer, acortar o "mejorar" el nombre de la rama, que rompe la automatización de estados.
**Reference**: `git-environment-flow` y `github-conventions` lo referencian; no lo redefinen. Ver la rama en `rules/branch/p0-branch-naming.md` y el PR en `rules/pr/p1-issue-linking.md` de github-conventions.

## Contrato

1. **Rama**: el `branchName` del ticket, verbatim — p. ej. `feature/cou-262-corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de`.
2. **PR**: descripción con `fixes COU-###` — p. ej., `fixes COU-262`.
3. **Estados automáticos**: los define el equipo en Linear (`start` → In Progress, `review` → In Review, `merge` → Done). La automatización compara el nombre de la rama contra `branchName`.

## Reglas

1. **Fuente única** — solo `linear-tickets` define `COU-###`; los demás skills referencian.
2. **Keyword exacto** — `fixes` en minúsculas, con el número del ticket.
3. **Rama sin manos** — el string lo genera Linear (lo trunca a su largo máximo); no se compone, no se acorta, no se mejora.
4. **Coordinado** — rama y PR usan el mismo `COU-###` para que la automatización conecte ambos.

**Ejemplos**:
```
✅ Rama: feature/cou-262-corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de
✅ PR:   fixes COU-262
✅ Tras merge, el ticket pasa a Done automáticamente.
❌ Rama: feat/COU-262-auth-action-status-codes
❌ Definir el contrato COU-### de nuevo en otro skill.
```
