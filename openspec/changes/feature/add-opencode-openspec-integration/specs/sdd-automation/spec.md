# sdd-automation Specification

## Overview

GitHub Action que automatiza la creación de issues desde cambios de OpenSpec.

## Requirements

### F01 - Trigger
- Corre en push a ramas main, develop, feature/**, bugfix/**, hotfix/**
- También corre en PRs (opened, synchronize, reopened)
- Solo dispara cuando hay cambios en `openspec/changes/**` o `openspec/specs/**`

### F02 - Extracción de Datos
- Detecta directorios de cambios modificados
- Lee proposal.md para obtener título
- Lee tasks.md para extraer tareas pendientes

### F03 - Creación de Issues
- Crea issue principal por cada cambio con labels `sdd` + `enhancement`
- Crea issues individuales por cada task con labels `sdd` + `task`
- Evita duplicados verificando si ya existen

### F04 - Metadata
- Incluye referencia a la rama de origen
- Lista archivos modificados
- Vincula con el evento (push/PR)

## Acceptance Criteria

- [ ] Action corre correctamente en pushes a main/develop
- [ ] Action corre correctamente en PRs
- [ ] Crea issues principales y de tasks
- [ ] Evita duplicados
- [ ] Incluye metadata de rama y evento