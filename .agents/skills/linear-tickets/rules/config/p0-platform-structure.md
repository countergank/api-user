---
priority: P0
category: config
---

# Contrato de extensión platform/structure

**Do**: Selecciona `platform` + `structure` en el bloque de config del SKILL.md. Hoy solo existen `linear`/`nativa`. Un nuevo proveedor (nueva plataforma o estructura) debe aportar archivos hermanos; es aditivo y nunca reescribe las reglas existentes.
**Avoid**: Modificar las reglas `p0/p1` existentes para acomodar un nuevo proveedor, o duplicar el contrato en varios lugares.
**Reference**: Este archivo es la norma; `../title/p0-title-format.md` y `../description/p0-description-structure.md` son los defaults de `linear/nativa`.

## Contrato del proveedor (obligatorio)

Un proveedor nuevo (plataforma o estructura) DEBE suministrar, como archivos hermanos:

1. **Regla de título** — formato de título del ticket para ese proveedor.
2. **Estructura de descripción** — formato Contexto → Scope → Criterios (o equivalente).
3. **Formato de AC** — cómo se escriben los criterios de aceptación testeables.
4. **Keywords de integración/vinculación** — tokens de rama/PR y keywords de cierre (p. ej., `fixes`).
5. **Plantillas por tipo** — una plantilla por tipo de ticket en `assets/templates/`.

## Reglas

1. **Aditivo** — los archivos nuevos se añaden como hermanos; no se reescriben las reglas `linear/nativa`.
2. **Selectable** — el bloque de config del SKILL.md elige qué proveedor aplica por defecto.
3. **Testeable** — cada proveedor nuevo se valida contra su contrato antes de agregarlo.

**Ejemplos**:
```
✅ Default: platform=linear, structure=nativa  (reglas actuales).
✅ Un nuevo platform aporta 5 archivos hermanos sin tocar los existentes.
❌ Reescribir p0-title-format.md para otra plataforma.
```
