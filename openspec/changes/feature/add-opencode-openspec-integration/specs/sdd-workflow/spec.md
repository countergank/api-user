# sdd-workflow Specification

## Overview

Workflow de Spec-Driven Development usando OpenSpec integrado con el flujo de Git.

## Requirements

### F01 - Inicialización
- `openspec init` configurado en el proyecto
- Slash commands de OpenSpec disponibles en IDEs soportados

### F02 - Propuesta de Cambios
- Comando `openspec new change <name>` para crear cambios
- Workflow: proposal → design → specs → tasks

### F03 - Sincronización con GitHub
- GitHub Action detecta cambios en `openspec/changes/` y `openspec/specs/`
- Crea issues automáticamente con labels `sdd` y `enhancement` o `task`
- Cada task individual se crea como issue separado

### F04 - Ramas y PRs
- Cambios se desarrollan en ramas feature/bugfix/hotfix
- El Action corre en PRs y pushes a ramas de features

## Acceptance Criteria

- [ ] OpenSpec inicializado correctamente
- [ ] Slash commands funcionan en VS Code
- [ ] GitHub Action crea issues al hacer push de cambios OpenSpec
- [ ] Los issues incluyen referencia a la rama de origen