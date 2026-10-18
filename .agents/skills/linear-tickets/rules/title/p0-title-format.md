---
priority: P0
category: title
---

# Formato de título `[Verbo] [Qué] [Contexto]`

**Do**: Escribe el título del ticket como `[Verbo] [Qué] [Contexto]`, con verbo en imperativo español en primer lugar, para que sea scaneable en el board y único.
**Avoid**: Títulos vagos o sin verbo (`probar login`), nombres propios, siglas internas, o títulos que repitan el número del ticket.
**Reference**: `../config/p0-platform-structure.md` — contrato de extensión para nuevas plataformas/estructuras.

## Estructura

| Segmento | Qué | Ejemplo |
|----------|-----|---------|
| `[Verbo]` | Verbo en imperativo español | `Arreglar`, `Añadir`, `Mejorar` |
| `[Qué]` | Objeto del cambio | `scroll en navbar`, `login con OAuth2` |
| `[Contexto]` | Dónde/cuándo aplica | `móvil`, `en checkout`, `admin` |

## Reglas

1. **Verbo primero** — siempre un verbo en imperativo (`Arreglar`, `Añadir`, `Extraer`).
2. **Scaneable** — título corto, legible en una línea del board.
3. **Único** — distingue el ticket del resto al primer vistazo.
4. **Español** — contenido en español (ver LT-05 para el split de tooling).

**Ejemplos**:
```
✅ Good: Arreglar scroll en navbar móvil
✅ Good: Añadir login con OAuth2
✅ Good: Mejorar validación de email en registro
❌ Bad:  scroll navbar            ← sin verbo
❌ Bad:  Fix del bug #COU-042     ← número en título
❌ Bad:  varias cosas a la vez    ← sin verbo ni contexto claro
```
