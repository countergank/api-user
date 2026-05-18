import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDTO, SORTABLE_FIELDS } from './pagination-query.dto';

describe(PaginationQueryDTO.name, () => {
  it('should apply default values when no params provided', async () => {
    const dto = plainToInstance(PaginationQueryDTO, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sortBy).toBe('createdAt');
    expect(dto.sortOrder).toBe('desc');
  });

  it('should accept valid custom pagination params', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { page: 2, limit: 10, sortBy: 'name', sortOrder: 'asc' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
    expect(dto.sortBy).toBe('name');
    expect(dto.sortOrder).toBe('asc');
  });

  it('should reject page < 1', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { page: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject negative page', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { page: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject limit > 100', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { limit: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject limit < 1', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { limit: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid sortBy not in whitelist', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { sortBy: 'invalidField' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept all sortable fields', async () => {
    for (const field of SORTABLE_FIELDS) {
      const dto = plainToInstance(PaginationQueryDTO, { sortBy: field });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('should reject invalid sortOrder', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { sortOrder: 'random' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should accept asc and desc sortOrder', async () => {
    const dtoAsc = plainToInstance(PaginationQueryDTO, { sortOrder: 'asc' });
    const errorsAsc = await validate(dtoAsc);
    expect(errorsAsc).toHaveLength(0);

    const dtoDesc = plainToInstance(PaginationQueryDTO, { sortOrder: 'desc' });
    const errorsDesc = await validate(dtoDesc);
    expect(errorsDesc).toHaveLength(0);
  });

  it('should transform isActive string "true" to boolean true', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { isActive: 'true' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(true);
  });

  it('should transform isActive string "false" to boolean false', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { isActive: 'false' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(false);
  });

  it('should accept role filter', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { role: 'admin' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.role).toBe('admin');
  });

  it('should accept search filter', async () => {
    const dto = plainToInstance(PaginationQueryDTO, { search: 'juan' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('juan');
  });

  it('should accept combined filters', async () => {
    const dto = plainToInstance(PaginationQueryDTO, {
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
      role: 'admin',
      isActive: 'true',
      search: 'juan',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
