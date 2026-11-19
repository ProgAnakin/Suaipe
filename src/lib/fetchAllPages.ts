// Supabase / PostgREST caps every response at `max_rows` (1000 by default) — a plain
// `.select()` silently returns the first 1000 rows, however many exist. Anything that has to see
// ALL the rows (KPI cards, CSV exports, the stats) reads them page by page through this helper.

export interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface AllPages<T> {
  rows: T[];
  /** the safety cap was reached: there are more rows than were read */
  truncated: boolean;
  error: { message: string } | null;
}

/**
 * Calls `fetchPage(from, to)` (inclusive row range, as for supabase `.range()`) until a page comes
 * back short. The query must have a STABLE order (add a unique tiebreaker such as `id`), or rows
 * can repeat / vanish across pages.
 *
 * A kiosk keeps inserting leads while a multi-page read is under way. With the newest first, every
 * insert pushes the rows below it one place down, so the last row of one page comes back as the first
 * row of the next: a total (or an "exhaustive" CSV) that counts a lead twice. Pass `key` (e.g. the row
 * id) and a row that was already read is dropped. Nothing is ever skipped by an insert — only a
 * delete (a purge run in the middle of an export) can shift rows the other way.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  { pageSize = 1000, maxRows = 50_000, key }: { pageSize?: number; maxRows?: number; key?: (row: T) => string } = {},
): Promise<AllPages<T>> {
  const rows: T[] = [];
  const seen = key ? new Set<string>() : null;
  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { rows, truncated: false, error };
    const page = data ?? [];
    for (const row of page) {
      if (seen && key) {
        const k = key(row);
        if (seen.has(k)) continue;
        seen.add(k);
      }
      rows.push(row);
    }
    if (page.length < pageSize) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: true, error: null };
}
