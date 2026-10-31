# Método Linear — resumen local

Resumen del enfoque por defecto de Linear para tareas "planas": tickets pequeños, autónomos y ejecutables de forma asíncrona, sin ceremonia de Scrum.

## Principios

- **Task plana** — un ticket describe un trabajo unitario, sin dependencias de DoR/ceremonia.
- **Ejecutable async** — un compañero puede entregarlo sin hablar contigo.
- **Criterios testeables** — lista de verificación (checklist) en lugar de Given/When/Then.
- **Campos obligatorios** — proyecto, estimación y asignado se completan como campos del ticket: no son ceremonia, son los datos que el flujo necesita antes de implementar.

## En la práctica

- Título scaneable `[Verbo] [Qué] [Contexto]` (ver `rules/title.md`).
- Descripción Contexto → Scope → Criterios (ver `rules/description.md`).
- Plantillas por tipo en `assets/templates/`, elegidas en las puertas de decisión del `SKILL.md`.
- La rama sale del campo `branchName`; `kickoff` la crea y mueve el ticket de estado (ver `rules/integration.md`).
- Contenido en español, tooling en inglés (ver `rules/language.md`).

## Fuente

Este es un resumen local del método; no sustituye la documentación oficial de Linear.
