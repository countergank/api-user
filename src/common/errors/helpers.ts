import { HttpStatus } from '@nestjs/common';

export const statusKey = (status: HttpStatus): string => {
  return Object.keys(HttpStatus).find((key) => HttpStatus[key] == status);
};
