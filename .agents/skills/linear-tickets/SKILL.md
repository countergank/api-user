---
name: linear-tickets
description: "Trigger: linear, tickets, issues, alta de tickets, crear ticket, tarea, ticket Linear. Estándar organizacional para crear y vincular tickets de Linear."
license: MIT
metadata:
  author: countergank
  version: "1.0.0"
---

## When to Apply

Actívalo al crear, editar o revisar tickets de Linear, al nombrar ramas vinculadas a un ticket (`COU-###`), o al escribir la descripción de un PR que cierra un ticket con `fixes COU-###`. Cubre el estándar lineal para agentes y personas.

## Rule Categories by Priority

| Priority | Category | Key Rules |
|----------|----------|-----------|
| P0 | Title | `[Verbo] [Qué] [Contexto]` en español |
| P0 | Description | Contexto → Scope → Criterios de aceptación |
| P0 | Config | Extensión `platform`/`structure` (contrato) |
| P0 | Labels | Set de tipos + componentes (inglés) |
| P1 | Templates | Cuándo usar cada plantilla por tipo |
| P1 | Language | Contenido ES / tooling EN |
| P1 | Integration | `COU-###` en rama y `fixes COU-###` en PR |

## Ticket Conventions (config)

```text
platform:  linear
structure: nativa
```

## Decision Gates

| Situación | Acción |
|-----------|--------|
| Bug | Plantilla `bug.md` + label `bug` |
| Feature | Plantilla `feature.md` + label `feature` |
| Investigación | Plantilla `spike.md` + label `spike` |
| Mantenimiento | Plantilla `chore.md` + label `chore` |

## Execution Steps

1. Carga `rules/<category>/pX-*.md` según la prioridad (P0 siempre, P1 según contexto).
2. Usa la plantilla de `assets/templates/<tipo>.md` para el ticket.
3. Vincula `COU-###` en la rama y `fixes COU-###` en el PR.

## Output Contract

Devuelve un ticket Linear con título `[Verbo] [Qué] [Contexto]` scaneable, descripción completa en español (Contexto → Scope → Criterios), labels en inglés, y enlace `COU-###`/`fixes COU-###` único.

## References

- `references/linear-method.md` — resumen local del método Linear (task plana).

## Compatibility

- `github-conventions` — fuente única del contrato `COU-###`/`fixes`; este skill lo define, github-conventions lo referencia.
