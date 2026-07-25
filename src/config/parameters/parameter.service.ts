import { Injectable } from '@nestjs/common';
import { ParameterStore } from './parameter.store';
import { ParameterRegistry } from './parameter-registry';
import { ParameterEntry } from './parameter.types';

@Injectable()
export class ParameterService {
  constructor(
    private readonly store: ParameterStore,
    private readonly registry: ParameterRegistry,
  ) {}

  async get(key: string): Promise<string | number | boolean> {
    return this.store.get(key);
  }

  async set(key: string, value: string | number | boolean): Promise<void> {
    this.registry.validate(key, value);
    await this.store.set(key, value);
  }

  async getAll(): Promise<ParameterEntry[]> {
    const defs = this.registry.getAll();
    if (defs.length === 0) {
      return [];
    }
    const keys = defs.map((d) => d.key);
    const runtimeValues = await this.store.getByKeys(keys);
    return defs.map((def) => {
      const runtimeValue = runtimeValues.get(def.key);
      const hasRuntimeValue = runtimeValue !== undefined;
      return {
        key: def.key,
        type: def.type,
        value: hasRuntimeValue ? runtimeValue : def.default,
        default: def.default,
        group: def.group,
        ttl: def.ttl,
        isOverridden: hasRuntimeValue && String(runtimeValue) !== String(def.default),
      };
    });
  }

  async getByGroup(group: string): Promise<ParameterEntry[]> {
    const all = await this.getAll();
    return all.filter((e) => e.group === group);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }
}