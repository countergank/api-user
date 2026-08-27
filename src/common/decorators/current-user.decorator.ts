import { createParamDecorator } from '@nestjs/common';
import { extractUser } from './extract-user.helper';

/**
 * Custom parameter decorator that extracts the authenticated user from the request.
 * The user is attached by the JWT auth guard (Passport strategy).
 * Returns undefined when no guard has attached a user.
 */
export const CurrentUser = createParamDecorator(extractUser);
