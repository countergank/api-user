import { PaginatedResponseDTO } from './paginated-response.dto';

describe(PaginatedResponseDTO.name, () => {
  it('should create the envelope with the given page metadata', () => {
    const data = [{ id: '1' }, { id: '2' }];

    const result = PaginatedResponseDTO.of(data, 2, 1, 20);

    expect(result.data).toEqual(data);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should round totalPages up when total is not a multiple of limit', () => {
    const result = PaginatedResponseDTO.of([], 42, 1, 20);

    expect(result.totalPages).toBe(3);
  });

  it('should return totalPages=1 when total fits in a single page', () => {
    const result = PaginatedResponseDTO.of([], 13, 1, 20);

    expect(result.totalPages).toBe(1);
  });

  it('should return totalPages=0 when total is 0', () => {
    const result = PaginatedResponseDTO.of([], 0, 1, 20);

    expect(result.totalPages).toBe(0);
  });
});
