import { ParameterDefinition } from './parameter.types';

export const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  {
    key: 'EMAIL_PROVIDER',
    type: 'string',
    default: 'smtp',
    group: 'email',
    ttl: 300, // 5 minutes
    validate: (v) => ['smtp', 'resend'].includes(v as string),
  },
];