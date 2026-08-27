import { runInTransaction } from './transaction';
import { Connection, ClientSession } from 'mongoose';

describe('runInTransaction', () => {
  let mockConnection: jest.Mocked<Pick<Connection, 'startSession'>>;
  let mockSession: jest.Mocked<ClientSession>;

  beforeEach(() => {
    mockSession = {
      withTransaction: jest.fn(),
      endSession: jest.fn(),
      abortTransaction: jest.fn(),
      commitTransaction: jest.fn(),
    } as unknown as jest.Mocked<ClientSession>;

    mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };
  });

  it('should start a session and run callback within transaction', async () => {
    const callback = jest.fn().mockResolvedValue('result');
    mockSession.withTransaction.mockImplementation(callback);

    const result = await runInTransaction(mockConnection as unknown as Connection, callback);

    expect(mockConnection.startSession).toHaveBeenCalled();
    expect(mockSession.withTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
    expect(result).toBe('result');
  });

  it('should propagate errors from transaction', async () => {
    const error = new Error('transaction failed');
    mockSession.withTransaction.mockRejectedValue(error);

    await expect(
      runInTransaction(mockConnection as unknown as Connection, jest.fn()),
    ).rejects.toThrow('transaction failed');

    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it('should fall back to non-transactional when startSession fails', async () => {
    mockConnection.startSession.mockRejectedValue(new Error('standalone MongoDB'));
    const callback = jest.fn().mockResolvedValue('fallback-result');

    const result = await runInTransaction(mockConnection as unknown as Connection, callback);

    expect(callback).toHaveBeenCalled();
    expect(result).toBe('fallback-result');
  });

  it('should end session even when callback throws', async () => {
    mockSession.withTransaction.mockRejectedValue(new Error('boom'));

    await expect(
      runInTransaction(mockConnection as unknown as Connection, jest.fn().mockRejectedValue(new Error('boom'))),
    ).rejects.toThrow();

    expect(mockSession.endSession).toHaveBeenCalled();
  });
});
