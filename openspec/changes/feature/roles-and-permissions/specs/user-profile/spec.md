# user-profile Specification

## Overview

Gestión de perfil de usuario autenticado.

## Requirements

### F01 - Get My Profile
- Endpoint: GET /users/profile
- Headers: Authorization: Bearer {accessToken}
- Response: { id, email, userName, name, lastName, role, permissions }
- MUST return 401 if not authenticated

### F02 - Update My Profile
- Endpoint: PATCH /users/profile
- Headers: Authorization: Bearer {accessToken}
- Body: { name?, lastName? }
- Response: { updated user }
- MUST NOT allow email change
- MUST return 401 if not authenticated

### F03 - Change Password
- Endpoint: POST /users/change-password
- Headers: Authorization: Bearer {accessToken}
- Body: { currentPassword, newPassword }
- Response: { message }
- MUST validate current password
- MUST return 400 if current password incorrect

## Acceptance Criteria

- [ ] Get profile retorna datos del usuario
- [ ] Update profile permite cambiar name/lastName
- [ ] Change password valida contraseña actual