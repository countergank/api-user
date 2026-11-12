import { DomainError } from '../../common/errors/domain.error';

export function emptyProfilePhotoError(): DomainError {
  return DomainError.fromKind('VALIDATION_ERROR', {
    message: 'Profile photo file is empty',
  });
}

export function photoLimitExceededError(): Error {
  return Object.assign(new Error('Profile photo exceeds the multipart request limit'), {
    name: 'PhotoLimitExceededError',
  });
}

export function missingPhotoPartError(): DomainError {
  return DomainError.fromKind('VALIDATION_ERROR', {
    message: 'The multipart request must carry a "file" part',
  });
}
