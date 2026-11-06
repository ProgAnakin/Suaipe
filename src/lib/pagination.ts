/** Follow actual returned row counts: a hosted API may cap pages below our request. */
export async function fetchAllPages<T extends { id: string }>(
  getPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null; count?: number | null }>,
  maxRows = 100_000,
): Promise<T[]> {
  const rows: T[] = [];
  const ids = new Set<string>();
  let expectedCount: number | undefined;
  for (;;) {
    const { data, error, count } = await getPage(rows.length, rows.length + 499);
    if (error) throw new Error('Data could not be loaded.');
    if (typeof count === 'number') {
      if (expectedCount !== undefined && count !== expectedCount) throw new Error('Data changed during loading. Please retry.');
      expectedCount = count;
    }
    if (!data?.length) {
      if (expectedCount !== undefined && expectedCount !== rows.length) throw new Error('Incomplete data. Please retry.');
      return rows;
    }
    if (rows.length + data.length > maxRows) throw new Error('Too many rows. Choose a smaller date range.');
    for (const row of data) {
      if (ids.has(row.id)) throw new Error('Data changed during loading. Please retry.');
      ids.add(row.id);
      rows.push(row);
    }
  }
}
