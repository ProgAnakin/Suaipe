// Building PostgREST `.or()` filters from text a person typed.

/**
 * `col.ilike."%term%"` for every column, joined for `.or()`. Two layers of escaping:
 *  1. the LIKE wildcards % _ and \ in the term are made literal (`\%`, `\_`, `\\`);
 *  2. the whole value goes inside double quotes — PostgREST treats , . : ( ) as syntax unless the
 *     value is quoted, so searching "Smith (Jr)" or "a,b" used to break the query (and the list
 *     went blank) — with \ and " escaped for the quoting.
 * Returns null when there is nothing to search for.
 */
export function ilikeAny(columns: string[], term: string): string | null {
  const t = term.trim();
  if (!t) return null;
  const literal = t.replace(/[\\%_]/g, "\\$&");
  const quoted = literal.replace(/[\\"]/g, "\\$&");
  return columns.map((c) => `${c}.ilike."%${quoted}%"`).join(",");
}
