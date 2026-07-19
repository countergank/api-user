# Fix SDD Issues Sync Workflow

## Problem

El workflow `sdd-sync.yml` dejó de funcionar correctamente después de un tiempo sin cambios. Los errores incluían:

1. **Captura de directorios inválidos**: Detectaba directorios como "archive" y "refactor" literalmente como changes
2. **Error en GITHUB_ENV**: El formato `>> $GITHUB_ENV` estaba deprecated
3. **Falta de GH_TOKEN**: Los steps que usaban `gh` CLI no tenían el token configurado

## Scope

Corregir el workflow para que funcione correctamente con la estructura actual de openspec.

## Approach

1. Cambiar de `GITHUB_ENV` a `GITHUB_OUTPUT` para variables de salida de steps
2. Detectar solo cambios que tienen `proposal.md` (evitar directorios template)
3. Excluir explícitamente directorios "archive" y "refactor"
4. Agregar `GH_TOKEN` a todos los steps que usan `gh` CLI
5. Usar step outputs (`steps.find.outputs.CHANGES`) para pasar variables entre steps