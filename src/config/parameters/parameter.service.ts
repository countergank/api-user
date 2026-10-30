import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { DomainError } from '../../common/errors/domain.error';
import { ParameterRegistry } from './parameter-registry';
import { ParameterStore } from './parameter.store';
import { ParameterEntry } from './parameter.types';

@Injectable()
export class ParameterService implements OnApplicationBootstrap {
  static instance: ParameterService | null = null;

  static ensureInitialized(): ParameterService {
    if (!ParameterService.instance) {
      throw new Error('ParameterService has not been initialized. Ensure onApplicationBootstrap has run.');
    }
    return ParameterService.instance;
  }

  constructor(
    private readonly store: ParameterStore,
    private readonly registry: ParameterRegistry,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    ParameterService.instance = this;
    // Precalienta cada parámetro definido. Además de poblar la caché, esto valida los overrides
    // de entorno en el arranque: un valor inválido rompe el boot en vez de la primera request
    // que lo lea (advisory R1-env-boolean-throws de la review de COU-327).
    for (const definition of this.registry.getAll()) {
      await this.store.get(definition.key);
    }
  }

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

  /**
   * Collection envelope for the admin endpoints (COU-260): the group filter is
   * applied before slicing, so `total` counts the filtered set.
   */
  async findPaginated(filters: {
    group?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponseDTO<ParameterEntry>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const all = await this.getAll();
    const scoped = filters.group ? all.filter((e) => e.group === filters.group) : all;
    const start = (page - 1) * limit;

    return PaginatedResponseDTO.of(scoped.slice(start, start + limit), scoped.length, page, limit);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  async delete(key: string): Promise<void> {
    await this.store.delete(key);
  }

  /**
   * Validate, coerce, and persist a parameter update.
   *
   * Encapsulates all admin-update validation previously living in
   * ParameterAdminController, throwing DomainError kinds that the
   * AllExceptionsFilter translates for the HTTP response.
   */
  async update(key: string, value: string): Promise<ParameterEntry> {
    // 1. Existence
    if (!this.has(key)) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND');
    }

    // 2. Env override check — get current entries to check isOverridden
    const allEntries = await this.getAll();
    const currentEntry = allEntries.find((e) => e.key === key);
    if (currentEntry?.isOverridden) {
      throw DomainError.fromKind('PARAMETER_OVERRIDDEN');
    }

    // 3. Coerce & validate
    const coerced = this.validateAndCoerce(key, value);

    // 4. Set value (set() calls registry.validate internally)
    await this.set(key, coerced);

    // 5. Return updated entry (we know the key exists at this point)
    const updatedEntries = await this.getAll();
    const entry = updatedEntries.find((e) => e.key === key);
    if (!entry) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND'); // defensive
    }
    return entry;
  }

  /**
   * Coerce the raw string value to the registry-defined parameter type.
   */
  private validateAndCoerce(key: string, raw: string): string | number | boolean {
    const def = this.registry.findByKey(key);
    if (!def) {
      throw DomainError.fromKind('PARAMETER_NOT_FOUND');
    }

    switch (def.type) {
      case 'number': {
        const n = Number(raw);
        if (Number.isNaN(n)) {
          throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
        }
        if (n <= 0 && key === 'THROTTLE_LIMIT') {
          throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
        }
        return n;
      }
      case 'boolean': {
        const lower = raw.toLowerCase();
        if (!['true', 'false', '1', '0'].includes(lower)) {
          throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
        }
        return ['true', '1'].includes(lower);
      }
      default:
        return raw;
    }
  }
}
