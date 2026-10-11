// "From 5 Jan to 7 Jan" in a date picker means the viewer's own local days. `new Date("2026-01-05")`
// parses a date-only string as UTC midnight — hours off from the viewer's midnight — and
// "…T23:59:59" without a zone is read by the server as UTC. These helpers build the real bounds.

/** Local 00:00:00.000 of a YYYY-MM-DD day, as an ISO instant. */
export function startOfLocalDayISO(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/** Local 23:59:59.999 of a YYYY-MM-DD day, as an ISO instant. */
export function endOfLocalDayISO(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}
