import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListTemplatesQueryDTO } from './list-templates-query.dto';

describe(ListTemplatesQueryDTO.name, () => {
  // Reproduce the global ValidationPipe options (enableImplicitConversion), which is what
  // turns `?active=false` into Boolean('false') = true before any @Transform runs.
  const parse = (query: Record<string, unknown>) =>
    plainToInstance(ListTemplatesQueryDTO, query, { enableImplicitConversion: true });

  it('accepts active=true as a boolean and keeps the pagination defaults', async () => {
    const dto = parse({ active: 'true' });

    expect(dto.active).toBe(true);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('accepts active=false as a boolean', async () => {
    const dto = parse({ active: 'false' });

    expect(dto.active).toBe(false);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('leaves active undefined when the param is omitted', async () => {
    const dto = parse({ page: '2', limit: '5' });

    expect(dto.active).toBeUndefined();
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejects a non-boolean active value', async () => {
    const dto = parse({ active: 'now' });

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
