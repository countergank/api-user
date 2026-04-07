## 1. OpenSpec Setup

- [ ] 1.1 Verificar instalación de openspec global (`npm install -g @fission-ai/openspec@latest`)
- [ ] 1.2 Confirmar estructura de `openspec/` creada correctamente
- [ ] 1.3 Probar slash commands en VS Code reiniciando el IDE

## 2. OpenCode Skill NestJS

- [ ] 2.1 Crear `.opencode/nestjs-backend-best-practices/SKILL.md`
- [ ] 2.2 Crear `.opencode/nestjs-backend-best-practices/references/advanced-patterns.md`
- [ ] 2.3 Verificar que el skill se carga correctamente con OpenCode

## 3. GitHub Action SDD Issues

- [ ] 3.1 Crear `.github/workflows/sdd-issues.yml`
- [ ] 3.2 Configurar triggers para ramas main, develop, feature/**, bugfix/**, hotfix/**
- [ ] 3.3 Implementar lógica de extracción de directorios de cambios
- [ ] 3.4 Implementar creación de issues principales y de tasks
- [ ] 3.5 Probar action con push de prueba

## 4. MCP GitHub Configuration

- [ ] 4.1 Crear `.vscode/mcp.json` con configuración del servidor MCP
- [ ] 4.2 Verificar que usa variable GITHUB_TOKEN del sistema
- [ ] 4.3 Probar MCP en VS Code Agent mode

## 5. Documentación y Testing

- [ ] 5.1 Crear ejemplo de cambio SDD de prueba
- [ ] 5.2 Ejecutar workflow completo (propose → push → verify issues)
- [ ] 5.3 Documentar el proceso en README del proyecto