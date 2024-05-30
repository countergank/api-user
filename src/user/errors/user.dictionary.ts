export enum UserErrorAlias {
  UserNotFound = '001',
  UserNameAlreadyExists = '002',
  UserEmailAlreadyExists = '003',
  UserPopulate = '004',
}

export enum UserErrorMessage {
  '001' = 'Usuario no encontrado.',
  '002' = 'El nombre de usuario ya existe.',
  '003' = 'El email de usuario ya existe.',
  '004' = 'Error al poblar usuarios.',
}
