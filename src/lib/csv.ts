/** Quote every cell and neutralize formulas, including whitespace/control prefixes. */
export function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\p{Cc}/gu, ' ');
  const safe = /^[\s]*[=+\-@|%]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function createCsv(rows: unknown[][], delimiter = ','): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(delimiter)).join('\r\n');
}
