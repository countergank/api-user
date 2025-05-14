export enum ErrorCodes {
  Base = '000',
  UserNotFound = '001',
  UserNameAlreadyExists = '002',
  UserEmailAlreadyExists = '003',
  UserPopulate = '004',
}

export enum ErrorMessages {
  '000' = 'Error en User.',
  '001' = 'Error User, al obtener el registro.',
  '002' = 'Error User, el nombre ya existe.',
  '003' = 'Error User, el email ya existe.',
  '004' = 'Error User, al poblar base de datos.',
}
