import { describe, expect, it, vi } from 'vitest';
import { createCsv } from '@/lib/csv';
import { parsePriceCsv, applyPriceUpdates } from '@/lib/priceCsv';
const known=new Set(['one','two','=special']);
describe('price CSV input boundaries',()=>{
 it('round-trips the safe quoted template, BOM and comma decimals',()=>{
  const file=createCsv([['product_id','price'],['one','€49,00'],['two','']]);
  expect(parsePriceCsv(file,known)).toEqual([{productId:'one',newPrice:'€49,00'},{productId:'two',newPrice:''}]);
 });
 it('round-trips a formula-protected product ID only when it is known',()=>{
  expect(parsePriceCsv(createCsv([['product_id','price'],['=special','€12']]),known)[0].productId).toBe('=special');
 });
 it.each(['one,€10','product_id,price\nmissing,€10','product_id,price\none,€10\none,€12','product_id,price\none,=1+1','product_id,price\n"one,€10'])('rejects malformed or unsafe imports: %s',file=>{
  expect(()=>parsePriceCsv(file,known)).toThrow();
 });
 it('bounds bytes and row count',()=>{
  expect(()=>parsePriceCsv('x'.repeat(1024*1024+1),known)).toThrow('1 MB');
  expect(()=>parsePriceCsv('product_id,price\n'+Array.from({length:5001},()=> 'one,€10').join('\n'),known)).toThrow('5000');
 });
});
describe('partial import recovery',()=>{
 const rows=[{productId:'one',newPrice:'€10'},{productId:'two',newPrice:'€20'},{productId:'three',newPrice:'€30'}];
 it('stops at a rejected save and retries only the pending rows',async()=>{
  const save=vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const first=await applyPriceUpdates(rows,save);
  expect(first).toEqual({saved:1,remaining:rows.slice(1)});expect(save).toHaveBeenCalledTimes(2);
  save.mockResolvedValue(true);const retry=await applyPriceUpdates(first.remaining,save);
  expect(retry).toEqual({saved:2,remaining:[]});expect(save.mock.calls.filter(([id])=>id==='one')).toHaveLength(1);
 });
 it('keeps an ambiguous transport failure pending rather than reporting full success',async()=>{
  const save=vi.fn().mockRejectedValue(new Error('connection lost'));
  expect(await applyPriceUpdates(rows,save)).toEqual({saved:0,remaining:rows});expect(save).toHaveBeenCalledOnce();
 });
});
