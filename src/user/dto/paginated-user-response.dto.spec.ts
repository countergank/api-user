import { PaginatedUserResponseDTO } from './paginated-user-response.dto';
import { UserDTO } from './user.dto';
import { UserMock } from '../mocks/user.mock';

describe(PaginatedUserResponseDTO.name, () => {
  it('should create paginated response with correct shape', () => {
    const user = new UserMock();
    const data = [UserDTO.of(user)];
    const total = 1;
    const page = 1;
    const limit = 20;

    const result = PaginatedUserResponseDTO.of(data, total, page, limit);

    expect(result.data).toEqual(data);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('should calculate totalPages correctly for multiple pages', () => {
    const data: UserDTO[] = [];
    const total = 50;
    const page = 1;
    const limit = 10;

    const result = PaginatedUserResponseDTO.of(data, total, page, limit);

    expect(result.totalPages).toBe(5);
  });

  it('should return totalPages=0 when total is 0', () => {
    const data: UserDTO[] = [];
    const total = 0;
    const page = 1;
    const limit = 20;

    const result = PaginatedUserResponseDTO.of(data, total, page, limit);

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('should handle last page with fewer items', () => {
    const user = new UserMock();
    const data = [UserDTO.of(user)];
    const total = 25;
    const page = 3;
    const limit = 10;

    const result = PaginatedUserResponseDTO.of(data, total, page, limit);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(25);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it('should use generic type parameter correctly', () => {
    const user = new UserMock();
    const data = [UserDTO.of(user)];

    const result = PaginatedUserResponseDTO.of<UserDTO>(data, 1, 1, 20);

    expect(result.data[0]).toBeInstanceOf(UserDTO);
  });
});
