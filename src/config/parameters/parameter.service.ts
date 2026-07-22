import { Injectable } from '@nestjs/common';
import { ParameterStore } from './parameter.store';
import { ParameterRegistry } from './parameter-registry';

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

  has(key: string): boolean {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }
}