import { escapeCsvField, toCsv } from './csv';

describe('csv utils (RFC 4180)', () => {
  describe('escapeCsvField', () => {
    it('returns plain values untouched', () => {
      expect(escapeCsvField('juan')).toBe('juan');
      expect(escapeCsvField(42)).toBe('42');
      expect(escapeCsvField(true)).toBe('true');
    });

    it('renders null and undefined as empty fields', () => {
      expect(escapeCsvField(null)).toBe('');
      expect(escapeCsvField(undefined)).toBe('');
    });

    it('wraps fields containing a comma in quotes', () => {
      expect(escapeCsvField('Ana, Juana')).toBe('"Ana, Juana"');
    });

    it('escapes a quote by doubling it (RFC 4180)', () => {
      expect(escapeCsvField('Ana "R"')).toBe('"Ana ""R"""');
    });

    it('wraps fields containing a line break in quotes', () => {
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"');
    });
  });

  describe('toCsv', () => {
    it('emits the header row first and CRLF row separators', () => {
      const csv = toCsv(['id', 'name'], [
        ['1', 'Ana'],
        ['2', 'Beto'],
      ]);
      expect(csv).toBe('id,name\r\n1,Ana\r\n2,Beto');
    });

    it('escapes values with comma and quote inside a row', () => {
      const csv = toCsv(['name', 'role'], [['Ana, "R"', 'user']]);
      expect(csv).toBe('name,role\r\n"Ana, ""R""",user');
    });
  });
});
