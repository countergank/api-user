export type ParameterType = 'string' | 'number' | 'boolean';

export interface ParameterDefinition {
  key: string;
  type: ParameterType;
  default: string | number | boolean;
  group: string;
  ttl: number;
  validate?: (value: string | number | boolean) => boolean;
}

export interface ParameterEntry {
  key: string;
  type: ParameterType;
  value: string | number | boolean;
  default: string | number | boolean;
  group: string;
  ttl: number;
  isOverridden: boolean;
}