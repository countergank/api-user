## Context

El proyecto usa NestJS y actualmente no tiene un sistema estructurado de SDD. Se busca integrar OpenSpec para sistematizar el flujo de desarrollo, OpenCode skills para mejores prácticas NestJS, y automatizar la creación de issues en GitHub.

**Estado actual:**
- Sin estructura OpenSpec
- Sin skills de OpenCode para NestJS
- Sin automatización de issues desde SDD

## Goals / Non-Goals

**Goals:**
- Establecer workflow SDD con OpenSpec
- Integrar skills de OpenCode con mejores prácticas NestJS
- Automatizar sincronización de tasks a GitHub Issues
- Configurar MCP de GitHub para gestión de proyectos

**Non-Goals:**
- Migrar código existente
- Modificar arquitectura de la aplicación
- Configurar CI/CD más allá de los actions de SDD

## Decisions

| Decisión | Alternativas | Justificación |
|----------|--------------|---------------|
| OpenSpec schema "spec-driven" | "default", "lite" | Mayor estructura y validaciones para proyectos complejos |
| GitHub Action para issues | MCP, webhook manual | Automático, no requiere intervención, funciona en cualquier push |
| MCP oficial de GitHub | MCP de terceros | Oficial, más maintained, 28k stars |
| Skills en `.opencode/` | `.gentle/` | Compatible con OpenSpec (creó la estructura) |

## Risks / Trade-offs

- [Riesgo] Los skills de OpenCode pueden necesitar ajustes según evolucionen las necesidades → Mitigation: El skill está diseñado para expandirse
- [Riesgo] GitHub Action corre en push a cualquier rama → Mitigation: Solo dispara cuando hay cambios en `openspec/`
- [Trade-off] Integrar más tools = más configuración inicial → Justificación: El tiempo se recupera en consistencia y automatización