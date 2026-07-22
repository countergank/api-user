export type ParameterType = 'string' | 'number' | 'boolean';

export interface ParameterDefinition {
  key: string;
  type: ParameterType;
  default: string | number | boolean;
  group: string;
  ttl: number;
  validate?: (value: string | number | boolean) => boolean;
}