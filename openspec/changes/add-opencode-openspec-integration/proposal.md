## Why

El proyecto necesita sistematizar el desarrollo siguiendo Spec-Driven Development (SDD) con OpenSpec, establecer mejores prácticas de NestJS via skills de OpenCode, y automatizar la sincronización de tareas a GitHub Projects. Sin esta integración, el flujo de desarrollo es manual y propenso a inconsistencias entre specs, código e issues.

## What Changes

- Agregar estructura OpenSpec para SDD en el proyecto
- Crear skill de OpenCode con mejores prácticas NestJS senior
- Configurar GitHub Action para sincronizar cambios SDD a Issues
- Configurar MCP de GitHub oficial en VS Code
- Documentar workflow de desarrollo con las nuevas herramientas

## Capabilities

### New Capabilities
- `nestjs-best-practices`: Skill de OpenCode con arquitectura, testing, performance, security, observability
- `sdd-workflow`: Workflow SDD con OpenSpec + GitHub integration
- `github-mcp-integration`: Configuración MCP oficial de GitHub para gestión de proyectos
- `sdd-automation`: GitHub Action que crea issues automáticamente desde OpenSpec

### Modified Capabilities
- (ninguno por ahora - es una feature nueva)

## Impact

- Archivos nuevos en `.opencode/`, `.github/workflows/`, `openspec/`
- Configuración de VS Code en `.vscode/mcp.json`
- Dependencias: `@fission-ai/openspec` (ya instalado), GitHub MCP (Docker)