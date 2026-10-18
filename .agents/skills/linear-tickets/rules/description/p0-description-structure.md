---
priority: P0
category: description
---

# Estructura de descripción Contexto → Scope → Criterios

**Do**: Estructura la descripción en `Contexto` → `Scope` (in/out) → `Criterios de aceptación`, con AC como bullets de checklist verificables (sin ceremonia Given/When/Then).
**Avoid**: Ceremonia Scrum (DoR, Prioridad, Tamaño/Estimación), criterios no testeables, o descripciones sin contexto que obliguen a preguntar.
**Reference**: `../config/p0-platform-structure.md` — contrato de extensión para el formato de AC de nuevas estructuras.

## Estructura

1. **Contexto** — por qué existe el ticket y qué problema resuelve, en 2-3 frases.
2. **Scope** — qué está incluido y qué está explícitamente fuera.
3. **Criterios de aceptación** — bullets de checklist que describen comportamiento verificable + casos borde.

## Reglas

1. **Async-executable** — un compañero que lo lea sin hablar contigo puede entregarlo.
2. **Testeable** — cada AC declara un comportamiento verificable y sus bordes.
3. **Sin G/W/T** — no uses ceremonia Given/When/Then; usa bullets escaneables.
4. **Español** — contenido en español (ver LT-05 para tooling).

**Ejemplos**:
```
✅ Contexto: El scroll del navbar móvil se atasca con JS deshabilitado.
✅ Scope: Solo navbar móvil. Fuera: tablet y desktop.
✅ AC:
   - [ ] El scroll funciona sin JavaScript.
   - [ ] Sin zoom accidental en iOS al hacer scroll.
   - [ ] No rompe el menú hamburguesa existente.
❌ AC con Given/When/Then o prioridad/estimación.
```
