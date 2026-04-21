# Spec: Admin User Management and Data Security

## Overview

Sistema de gestión de usuarios con roles y seguridad de datos.

## System Rules

### SR-1: User Creation by Admin

**GIVEN** un administrador autenticado con JWT válido  
**AND** proporciona datos válidos del usuario incluyendo rol  
**WHEN** POST `/admin/users` es ejecutado  
**THEN** el usuario es creado con `isActive: true`  
**AND** retorna código 201 con datos del usuario creado

### SR-2: Role Required at Creation

**GIVEN** un administrador enviando datos para crear usuario  
**AND** el campo `role` no está presente o es inválido  
**WHEN** POST `/admin/users` es ejecutado  
**THEN** retorna código 400 con error de validación  
**AND** el usuario no es creado

### SR-3: Admin Access Only

**GIVEN** un usuario con rol `user` o `viewer`  
**AND** tiene JWT válido  
**WHEN** intenta acceder a cualquier endpoint `/admin/*`  
**THEN** retorna código 403 Forbidden  
**AND** el acceso es denegado

**GIVEN** un usuario con rol `admin`  
**AND** tiene JWT válido  
**WHEN** accede a cualquier endpoint `/admin/*`  
**THEN** la solicitud es procesada exitosamente

### SR-4: User Registration - Inactive by Default

**GIVEN** un usuario registrándose mediante `/auth/register`  
**WHEN** la solicitud es exitosa  
**THEN** el usuario es creado con `isActive: false`  
**AND** recibe tokens de acceso

### SR-5: Login Requires Active Account

**GIVEN** un usuario con cuenta inactiva (`isActive: false`)  
**WHEN** intenta hacer login en `/auth/login`  
**THEN** retorna código 401 Unauthorized  
**AND** mensaje: "User account is inactive"

### SR-6: Public Endpoints Return Minimal Data

**GIVEN** cualquier request a endpoint no-admin (ej: `/users/profile`, `/auth/login`)  
**WHEN** la respuesta es generada  
**THEN** NO incluye campos sensibles como:
- `id`
- `userName`
- `role`
- `permissions`
- `isActive`

**AND** SOLO incluye datos públicos:
- `name`
- `lastName`
- `email`

## Data Contracts

### CreateUserRequest (Admin)

```json
{
  "name": "string (required)",
  "lastName": "string (required)",
  "email": "string (required, unique)",
  "userName": "string (required, unique)",
  "password": "string (required, min 8)",
  "role": "string (required, enum: admin|user|viewer)"
}
```

### CreateUserResponse (Admin)

```json
{
  "name": "string",
  "lastName": "string",
  "email": "string",
  "userName": "string",
  "role": "admin|user|viewer",
  "isActive": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### PublicUserResponse

```json
{
  "name": "string",
  "lastName": "string",
  "email": "string"
}
```

### LoginResponse

```json
{
  "user": {
    "name": "string",
    "lastName": "string",
    "email": "string"
  },
  "accessToken": "string",
  "refreshToken": "string"
}
```

## Acceptance Criteria

- [x] AC-1: Admin puede crear usuarios con rol específico
- [x] AC-2: Usuarios de register están inactivos hasta verificación
- [x] AC-3: Usuarios de admin/seed están activos inmediatamente
- [x] AC-4: Endpoints `/admin/*` solo accesibles para admins
- [x] AC-5: Endpoints públicos no exponen datos sensibles
- [x] AC-6: Todos los tests pasan (43/43)
- [x] AC-7: Lint pasa sin errores