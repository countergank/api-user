---
priority: P1
category: templates
---

# Plantillas por tipo

**Do**: Usa la plantilla de `assets/templates/<tipo>.md` correspondiente al tipo del ticket y aplica el label de tipo asociado.
**Avoid**: Escribir tickets "a mano" sin plantilla, mezclar campos de distintos tipos, o usar el template de bug para un feature.
**Reference**: `../labels/p0-label-set.md` — set de labels por tipo y componente; plantillas en `assets/templates/`.

## Cuándo usar cada plantilla

| Tipo | Plantilla | Camps que aporta | Label |
|------|-----------|------------------|-------|
| Bug | `bug.md` | resumen, pasos, esperado-vs-actual, impacto, entorno | `bug` |
| Feature | `feature.md` | contexto, objetivo, no-objetivos, AC, links | `feature` |
| Spike | `spike.md` | entregable a investigar (mínimo) | `spike` |
| Chore | `chore.md` | mantenimiento (mínimo) | `chore` |

## Reglas

1. **Plantilla correcta** — elige según el tipo real del trabajo, no por conveniencia.
2. **Bug completo** — incluye pasos de reproducción + esperado vs actual + entorno.
3. **Spike/chore mínimos** — enmarcan un entregable sin ceremonia pesada.
4. **Labels** — añade tipo + componente (inglés) según el set confirmado.

**Ejemplos**:
```
✅ Bug con pasos reproducibles + entorno.
✅ Feature con objetivo, no-objetivos y AC testeables.
✅ Spike que enmarca qué entregable investigar.
❌ Un bug sin pasos de reproducción ni entorno.
```
