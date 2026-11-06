import { ExecutionContext } from '@nestjs/common';
import { extractSessionContext } from './extract-session-context.helper';

const httpContext = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe('extractSessionContext', () => {
  it('extracts ip and user agent from the request', () => {
    const request = {
      ip: '10.0.0.1',
      headers: { 'user-agent': 'agent-A' },
    };

    expect(extractSessionContext(undefined, httpContext(request))).toEqual({
      ip: '10.0.0.1',
      userAgent: 'agent-A',
    });
  });

  it('leaves the user agent undefined when the header is absent', () => {
    const request = { ip: '127.0.0.1', headers: {} };

    expect(extractSessionContext(undefined, httpContext(request))).toEqual({
      ip: '127.0.0.1',
      userAgent: undefined,
    });
  });
});
