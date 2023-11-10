import { GENERATING_HASH_ERROR } from './encode.dictionary';

describe('Dictionary codes', () => {
  it('should match all errors codes', () => {
    expect(GENERATING_HASH_ERROR.code).toBe('EENC01');
  });
});
