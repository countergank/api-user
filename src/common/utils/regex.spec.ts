import { escapeRegExp } from './regex';

describe('escapeRegExp', () => {
  it('should escape regex special characters to literal', () => {
    expect(escapeRegExp('hello.world')).toBe('hello\\.world');
    expect(escapeRegExp('test+value')).toBe('test\\+value');
    expect(escapeRegExp('a*b')).toBe('a\\*b');
  });

  it('should escape all special chars: .*+?^${}()|[]\\', () => {
    const input = '.*+?^${}()|[]\\';
    const escaped = escapeRegExp(input);
    const regex = new RegExp(escaped);
    expect(regex.test(input)).toBe(true);
  });

  it('should return normal strings unchanged', () => {
    expect(escapeRegExp('hello')).toBe('hello');
    expect(escapeRegExp('user@example.com')).toBe('user@example\\.com');
  });

  it('should produce a literal match when used in RegExp', () => {
    const input = 'price is $10.00 (USD)';
    const escaped = escapeRegExp(input);
    const regex = new RegExp(escaped);
    expect(regex.test(input)).toBe(true);
    expect(regex.test('price is $10X00 (USD)')).toBe(false);
  });
});
