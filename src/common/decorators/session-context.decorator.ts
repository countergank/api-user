import { createParamDecorator } from '@nestjs/common';
import { extractSessionContext } from './extract-session-context.helper';

export const SessionContext = createParamDecorator(extractSessionContext);
