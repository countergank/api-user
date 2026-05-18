export enum ErrorCodes {
  Base = '000',
  UserNotFound = '001',
  UserNameAlreadyExists = '002',
  UserEmailAlreadyExists = '003',
  UserPopulate = '004',
  UserAlreadyDeleted = '005',
  Reserved = '006',
}

export const ErrorMessages = {
  '000': {
    es: 'Error en User.',
    en: 'User module error.',
    pt: 'Erro no Módulo de Usuário.',
  },
  '001': {
    es: 'Error User, al obtener el registro.',
    en: 'User error, getting record.',
    pt: 'Erro de Usuário, ao obter registro.',
  },
  '002': {
    es: 'Error User, el nombre ya existe.',
    en: 'User error, username already exists.',
    pt: 'Erro de Usuário, nome de usuário já existe.',
  },
  '003': {
    es: 'Error User, el email ya existe.',
    en: 'User error, email already exists.',
    pt: 'Erro de Usuário, email já existe.',
  },
  '004': {
    es: 'Error User, al poblar base de datos.',
    en: 'User error, populating database.',
    pt: 'Erro de Usuário, ao popular banco de dados.',
  },
  '005': {
    es: 'Error User, el usuario ya fue eliminado.',
    en: 'User error, user has already been deleted.',
    pt: 'Erro de Usuário, o usuário já foi excluído.',
  },
};
