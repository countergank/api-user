export type CsvCellValue = string | number | boolean | null | undefined;

/**
 * Escapes a single CSV field per RFC 4180: a value containing a comma, a
 * quote or a line break is wrapped in quotes, and every quote inside it is
 * doubled.
 */
export function escapeCsvField(value: CsvCellValue): string {
  const field = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Builds a CSV document: header row first, rows separated by CRLF (RFC 4180). */
export function toCsv(headers: string[], rows: CsvCellValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\r\n');
}
