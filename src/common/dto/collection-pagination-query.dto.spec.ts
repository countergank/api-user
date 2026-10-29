import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CollectionPaginationQueryDTO } from './collection-pagination-query.dto';

describe(CollectionPaginationQueryDTO.name, () => {
  // Same options as the global ValidationPipe, so the spec cannot drift from the runtime.
  const parse = (query: Record<string, unknown>) =>
    plainToInstance(CollectionPaginationQueryDTO, query, { enableImplicitConversion: true });

  it('defaults to the first page of 20 items', async () => {
    const dto = parse({});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts integer page and limit', async () => {
    const dto = parse({ page: '2', limit: '5' });

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a fractional page, which would slice at a fractional offset', async () => {
    const dto = parse({ page: '1.5' });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('rejects a fractional limit', async () => {
    const dto = parse({ limit: '2.5' });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
