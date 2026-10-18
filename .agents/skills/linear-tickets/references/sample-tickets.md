# Tickets de ejemplo

Cinco tickets de muestra (todos los tipos) que ilustran el estándar: título, descripción con AC testeables y los links `COU-###`/`fixes` del contrato de integración.

> **Nota**: los IDs (`COU-042`, etc.) y descripciones son ficticios y ejemplifican el formato. No corresponden a tickets reales ni abren enlaces de cierre.

## 1. Bug — `COU-042`

**Título**: `Arreglar scroll en navbar móvil`

**Labels**: `bug` + `ui`

### Contexto
El scroll del navbar móvil se atasca con JavaScript deshabilitado y provoca zoom accidental en iOS.

### Scope
Solo el navbar móvil. Queda fuera tablet y desktop.

### Criterios de aceptación
- [ ] El scroll funciona sin JavaScript.
- [ ] No hay zoom accidental en iOS al hacer scroll.
- [ ] No rompe el menú hamburguesa existente.

**Branch**: `fix/COU-042-arreglar-scroll-navbar-movil`

## 2. Feature — `COU-043`

**Título**: `Añadir login con OAuth2`

**Labels**: `feature` + `api`

### Contexto
Los usuarios no pueden iniciar sesión con sus cuentas corporativas.

### Objetivo
Permitir login con OAuth2 y gestionar el refresh del token.

### No-objetivos
No se incluye multifactor ni recuperación de contraseña.

### Criterios de aceptación
- [ ] El login con OAuth2 completa el flujo en el entorno de staging.
- [ ] El token expirado se renueva sin volver a iniciar sesión.
- [ ] Un flujo cancelado no deja estado a medio iniciar.

**Branch**: `feat/COU-043-anadir-login-oauth2`

## 3. Spike — `COU-044`

**Título**: `Investigar migración a cola de mensajes`

**Labels**: `spike` + `infra`

### Entregable a investigar
Decidir entre un broker gestionado y self-managed para el envío de eventos de auditoría, con criterios de costo, latencia y operación.

**Branch**: `spike/COU-044-investigar-cola-mensajes`

## 4. Chore — `COU-045`

**Título**: `Actualizar dependencias de seguridad`

**Labels**: `chore` + `infra`

### Tarea de mantenimiento
Actualizar las dependencias del pipeline de CI con versiones parcheadas que corrigen CVEs conocidos, y verificar que el build no se rompe.

**Branch**: `chore/COU-045-actualizar-dependencias-seguridad`

## 5. Feature + Docs — `COU-046`

**Título**: `Documentar convenciones de tickets`

**Labels**: `feature` + `docs`

### Contexto
No hay una fuente única de cómo nombrar y estructurar tickets en el equipo.

### Objetivo
Publicar la guía de convenciones como referencia local del skill `linear-tickets`.

### No-objetivos
No se modifica el contrato de integración existente.

### Criterios de aceptación
- [ ] La guía cubre título, descripción, AC y labels.
- [ ] Enlaza a las plantillas por tipo.
- [ ] Referencia `linear-tickets` como fuente única del contrato `COU-###`.

**Branch**: `docs/COU-046-documentar-convenciones-tickets`
