import { ParameterDefinition, ParameterType } from './parameter.types';

const VALID_TYPES: ParameterType[] = ['string', 'number', 'boolean'];

export class ParameterRegistry {
  private readonly parameters = new Map<string, ParameterDefinition>();

  register(param: ParameterDefinition): void {
    if (!VALID_TYPES.includes(param.type)) {
      throw new Error(`Invalid type: ${param.type}. Must be one of: ${VALID_TYPES.join(', ')}`);
    }
    if (this.parameters.has(param.key)) {
      throw new Error(`Parameter "${param.key}" already registered`);
    }
    this.parameters.set(param.key, param);
  }

  findByKey(key: string): ParameterDefinition | undefined {
    return this.parameters.get(key);
  }

  getAll(): ParameterDefinition[] {
    return Array.from(this.parameters.values());
  }

  findByGroup(group: string): ParameterDefinition[] {
    return Array.from(this.parameters.values()).filter((p) => p.group === group);
  }

  listGroups(): string[] {
    const groups = new Set<string>();
    for (const param of this.parameters.values()) {
      groups.add(param.group);
    }
    return Array.from(groups);
  }

  validate(key: string, value: unknown): void {
    const param = this.parameters.get(key);
    if (!param) {
      throw new Error(`Parameter "${key}" not found`);
    }
    if (param.validate && !param.validate(value as string | number | boolean)) {
      throw new Error(`Parameter "${key}" validation failed for value: ${value}`);
    }
  }

  has(key: string): boolean {
    return this.parameters.has(key);
  }

  getDefault(key: string): string | number | boolean | undefined {
    return this.parameters.get(key)?.default;
  }

  getTTL(key: string): number | undefined {
    return this.parameters.get(key)?.ttl;
  }
}