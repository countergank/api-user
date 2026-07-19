# SDD Issues Sync Workflow Fix - Technical Design

## Changes Made

### 1. Variable Output Method

**Before** (deprecated):
```bash
echo "CHANGES=$changes" >> $GITHUB_ENV
```

**After** (recommended):
```bash
echo "CHANGES<<EOF" >> $GITHUB_OUTPUT
echo "$changes" >> $GITHUB_OUTPUT
echo "EOF" >> $GITHUB_OUTPUT
```

El formato `<<EOF` permite valores multilínea.

### 2. Detection Logic

**Before**:
```bash
changes=$(find openspec/changes -mindepth 1 -maxdepth 1 -type d \
  ! -name "archive" \
  ! -name "refactor" \
  -printf '%f\n' 2>/dev/null | grep -v "^$")
```

**After**:
```bash
changes=$(find openspec/changes -mindepth 1 -maxdepth 1 -type d \
  ! -name "archive" \
  ! -name "refactor" \
  -exec test -f {}/proposal.md \; -print 2>/dev/null | \
  awk -F'openspec/changes/' '{print $2}' | sort)
```

Ahora solo detecta directorios que tienen `proposal.md` (cambios reales de SDD).

### 3. Inter-Step Variable Passing

**Before**:
```bash
echo "$CHANGES" | while read -r change; do
```

**After**:
```yaml
- name: Create SDD issues
  run: |
    changes="${{ steps.find.outputs.CHANGES }}"
```

Se accede a los outputs del step anterior via `steps.<step-id>.outputs.<variable>`.

### 4. GH_TOKEN Environment

Agregado a cada step que usa `gh` CLI:

```yaml
- name: Create SDD issues
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    # gh commands here
```

## Files Modified

- `.github/workflows/sdd-sync.yml`

## Why These Changes

1. **GITHUB_ENV deprecated**: GitHub Actions cambió el mecanismo de salida en 2022
2. **Detección correcta**: La estructura de openspec cambió (agregado dirs template)
3. **Token requerido**: `gh` CLI necesita autenticación explícita en workflows