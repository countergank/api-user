/**
 * Escapes special regex characters in a string so they are treated as literals.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
