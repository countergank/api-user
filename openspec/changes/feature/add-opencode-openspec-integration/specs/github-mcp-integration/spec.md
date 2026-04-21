# github-mcp-integration Specification

## Overview

Configuración del MCP oficial de GitHub en VS Code para gestión de proyectos.

## Requirements

### F01 - Configuración MCP
- Archivo `.vscode/mcp.json` configurado
- Usa Docker para ejecutar el servidor MCP
- Autenticación via variable GITHUB_TOKEN

### F02 - Herramientas Disponibles
- CRUD de issues
- Gestión de Projects v2
- Creación y review de PRs
- Búsqueda de código y repos

### F03 - Permisos
- Token con scope `repo` mínimo
- Uso de variables de entorno para seguridad

## Acceptance Criteria

- [ ] MCP funciona en VS Code con Agent mode
- [ ] Herramientas de issues accesibles
- [ ] Token configurado via variable de entorno