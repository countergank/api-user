# 455-export-usuarios-csv

Feature: exportar la lista de usuarios a CSV con los filtros aplicados (issue #455).
Rama: `feature/455-export-usuarios-csv` · Base: `origin/develop` · Estimate: 3

## Specs

- S1: "`GET /admin/users/export.csv` que aplique los mismos filtros que la lista y devuelva el conjunto completo."
  Aplica `search`, `role` e `isActive` y devuelve el conjunto completo (ignora `page`/`limit`).
- S2: "`Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename=users.csv`."
- S3: "Primera fila con los encabezados de las columnas exportadas."
- S4: "Escapa comas, comillas y saltos de línea según RFC 4180 (una comilla se escapa duplicándola)."
- S5: "Exporta sólo los campos del DTO de administración: nada de `password` ni de estado de sesión."
- S6: "Swagger documentado y e2e: filtro aplicado, escape de un valor con coma y comilla, 401 sin token y 403 sin permiso."
- S7 (nota del issue): "Ruta bajo `/admin/users`: declararla **antes** de `@Get(':id')`, igual que `metrics`, o `:id` la captura."

No-objetivos (verbatim): "Exportación asíncrona con job y notificación." / "Otros formatos (xlsx, json)."

## Tasks

- T1 (S4) — utilidad de escape CSV + test unitario (RED→GREEN). `src/common/utils/csv.ts` — Commit: —
- T2 (S1) — consulta completa filtrada sin paginación: `buildListFilter` extraído + `findAllFiltered` en repository/service. Commit: —
- T3 (S1,S2,S3,S5,S7) — `GET export.csv` (antes de `@Get(':id')`), `StreamableFile`, `ExportUserDoc` Swagger, `ADMIN_USER_CSV_HEADERS` junto al DTO. Commit: —
- T4 (S6) — e2e `test/e2e/user/admin-user-export.e2e-spec.ts`: 5/5 (filtro completo, headers CSV, escape, 401, 403). Commit: —
- T5 — suite completa + reporte de diff y propuesta de commit (requiere autorización humana por AGENTS.md). En curso.

## Log

- L1: "Usemos la skill kickoff para ver con que seguir" → seleccionado issue #455 (board `api-user` #4, item PVTI_lADOBxekRc4BptzMzhFLeBI) → board a `In Progress`, rama creada.
- L2: "vamos" → arrancar implementación con ODD (spec document + tareas).
- L4: reporte "no baja nada de CSV desde Scalar" con 400 UA-COM-005 (role isString). Reproducido contra el server dev: `?role=admin&role=user` (parámetro repetido → Fastify lo parsea como array) genera exactamente ese error; `role=` vacío, valores únicos y sin query devuelven 200 CSV con headers correctos. Causa: Scalar mandó `role` duplicado; comportamiento esperado del DTO compartido con la lista. Sin cambio de código. Hallazgos: los dos callers también matchean el filtro por apellido (conteo corregido 7, no 5); fechas normalizadas a ISO 8601 en el CSV; lint de `src` ya tenía errores preexistentes (specs ajenos, `noDelete`/`noNonNullAssertion`). Sin commits: AGENTS.md exige autorización por commit.
