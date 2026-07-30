import { TraceIdMiddleware } from '../trace-id.middleware';

describe(TraceIdMiddleware.name, () => {
  let middleware: TraceIdMiddleware;

  beforeEach(() => {
    middleware = new TraceIdMiddleware();
  });

  it('should set x-trace-id header from request.id and store traceId on request', () => {
    const mockReq = { id: 'req_test_123', traceId: undefined } as any;
    const mockRes = { setHeader: jest.fn() } as any;
    const mockNext = jest.fn();

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', 'req_test_123');
    expect(mockReq.traceId).toBe('req_test_123');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate a traceId via randomUUID when request.id is missing', () => {
    const mockReq = { id: undefined, traceId: undefined } as any;
    const mockRes = { setHeader: jest.fn() } as any;
    const mockNext = jest.fn();

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('x-trace-id', expect.stringMatching(uuidPattern));
    expect(mockReq.traceId).toMatch(uuidPattern);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should call next() exactly once', () => {
    const mockReq = { id: 'req_test_456' } as any;
    const mockRes = { setHeader: jest.fn() } as any;
    const mockNext = jest.fn();

    middleware.use(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
