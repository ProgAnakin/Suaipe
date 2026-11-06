import { describe, expect, it, vi } from 'vitest';
import { csvCell, createCsv } from '@/lib/csv';
import { fetchAllPages } from '@/lib/pagination';
import { assertPublicSupabaseKey } from '@/lib/publicKey';

describe('CSV safety', () => {
  it.each(['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', ' \t=1+1', '\r\n+1'])('neutralizes %j', value => {
    expect(csvCell(value).startsWith('"\'')).toBe(true);
  });
  it('quotes delimiters, removes row/control injection and retains Unicode', () => {
    expect(csvCell('João, "Olá"\n')).toBe('"João, ""Olá"" "');
    expect(createCsv([['name'], ['João']])).toBe('\uFEFF"name"\r\n"João"');
  });
});
describe('Complete pagination', () => {
  it('follows a server cap smaller than the requested page', async () => {
    const fetch = vi.fn(async (from: number) => ({data: [{id:'a'},{id:'b'},{id:'c'}].slice(from,from+1),error:null}));
    expect(await fetchAllPages(fetch)).toHaveLength(3);
    expect(fetch.mock.calls.map(c => c[0])).toEqual([0,1,2,3]);
  });
  it('rejects partial results on error', async () => {
    await expect(fetchAllPages(async () => ({data:null,error:{message:'denied'}}))).rejects.toThrow();
  });
  it('rejects repeated pages rather than producing a duplicate export', async () => {
    await expect(fetchAllPages(async () => ({data:[{id:'a'}],error:null}))).rejects.toThrow('Data changed');
  });
  it('bounds memory and requires a narrower selection', async () => {
    await expect(fetchAllPages(async () => ({data:[{id:'a'},{id:'b'}],error:null}),1)).rejects.toThrow('Too many rows');
  });
});
describe('Public browser credentials', () => {
  it.each(['sb_secret_example','sbp_example',`eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({role:'service_role'}))}.example`])('rejects private credentials', key => {
    expect(() => assertPublicSupabaseKey(key)).toThrow();
  });
  it('accepts a public publishable key', () => { expect(() => assertPublicSupabaseKey('sb_publishable_example')).not.toThrow(); });
});
