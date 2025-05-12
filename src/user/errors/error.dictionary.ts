export enum ErrorCodes {
  Base = '000',
  UserNotFound = '001',
  UserNameAlreadyExists = '002',
  UserEmailAlreadyExists = '003',
  UserPopulate = '004',
}

export enum ErrorMessages {
  '000' = 'Error en User.',
  '001' = 'Error User, Usuario no encontrado.',
  '002' = 'Error User, el nombre de usuario ya existe.',
  '003' = 'Error User, el email de usuario ya existe.',
  '004' = 'Error User, al poblar usuarios.',
}
