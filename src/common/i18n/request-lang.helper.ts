/**
 * Extract the preferred language from an HTTP request's Accept-Language header.
 * Returns the 2-char language code (es, en, pt) or undefined.
 */
export function getRequestLang(req: any): string | undefined {
  const h = req?.headers?.['accept-language'];
  if (typeof h !== 'string') return undefined;
  const code = h.split(',')[0]?.trim()?.toLowerCase()?.slice(0, 2);
  return ['es', 'en', 'pt'].includes(code) ? code : undefined;
}
