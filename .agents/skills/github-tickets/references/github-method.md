# Método GitHub Issues + Projects — resumen local

Resumen del enfoque por defecto para tareas "planas": issues pequeñas, autónomas y ejecutables de forma asíncrona, sin ceremonia de Scrum.

## Principios

- **Task plana** — un issue describe un trabajo unitario, sin dependencias de DoR/ceremonia.
- **Ejecutable async** — un compañero puede entregarlo sin hablar contigo.
- **Criterios testeables** — lista de verificación (checklist) en lugar de Given/When/Then.
- **Campos obligatorios** — project board (el Project homónimo de la org), Estimate y assignee se completan como campos del issue: no son ceremonia, son los datos que el flujo necesita antes de implementar. El issue vive en el repo; el board solo lo proyecta con su `Status`.

## En la práctica

- Título scaneable `[Verbo] [Qué] [Contexto]` (ver `rules/title.md`).
- Descripción Contexto → Scope → Criterios (ver `rules/description.md`).
- Plantillas por tipo en `assets/templates/`, elegidas en las puertas de decisión del `SKILL.md`.
- La rama sale de la convención `feature/<number>-<slug>`; `kickoff` la crea y mueve el `Status` del board (ver `rules/integration.md`).
- `fixes #<number>` cierra el issue solo al mergear a la rama default; a `develop` lo cierra el agente (ver `rules/integration.md`).
- Contenido en español, tooling en inglés (ver `rules/language.md`).

## Fuente

Este es un resumen local del método; no sustituye la documentación oficial de GitHub Issues y Projects.
