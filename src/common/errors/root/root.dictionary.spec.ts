import { VERSION_NOT_FOUND_ERROR } from './root.dictionary';

describe('Dictionary codes', () => {
  it('should match all errors codes', () => {
    expect(VERSION_NOT_FOUND_ERROR.code).toBe('EROOT01');
  });
});
