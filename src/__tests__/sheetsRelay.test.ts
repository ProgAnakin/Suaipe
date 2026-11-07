// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRelayHandler, type RelayRecord } from '../../supabase/functions/relay-to-sheets/handler';
import { sendToSheets } from '../../supabase/functions/_shared/googleSheets';
const row:RelayRecord={email:'synthetic@example.invalid',nome:'=1+1',cognome:'Visitor',product_name:'Synthetic',match_percent:80,store_id:'lisboa',created_at:'2026-11-07T00:00:00Z',marketing_opt_in:true,marketing_withdrawn_at:null};
const getAuthorizedRecord=vi.fn();const transport=vi.fn<typeof fetch>();
beforeEach(()=>{getAuthorizedRecord.mockReset().mockResolvedValue(row);transport.mockReset().mockResolvedValue(new Response('{}'));});
const request=(body:unknown={session_id:'91000000-0000-4000-8000-000000000010'},headers:Record<string,string>={Authorization:'Bearer synthetic-token',Origin:'https://portfolio.example'})=>new Request('https://fixture.invalid',{method:'POST',headers,body:JSON.stringify(body)});
const handler=(enabled=true)=>createRelayHandler({enabled,origin:'https://portfolio.example',endpoint:'https://script.google.com/macros/s/fixture/exec',getAuthorizedRecord,transport});
describe('canonical, authorized Sheets relay',()=>{
 it('refuses unauthenticated callers, wrong origins and disabled integrations',async()=>{
  expect((await handler()(request({},{}))).status).toBe(401);
  expect((await handler()(request({},{Origin:'https://attacker.invalid'}))).status).toBe(403);
  expect((await handler(false)(request())).status).toBe(503);
  expect(getAuthorizedRecord).not.toHaveBeenCalled();expect(transport).not.toHaveBeenCalled();
 });
 it('refuses visitor-supplied contacts and oversized or invalid payloads',async()=>{
  expect((await handler()(request({session_id:'91000000-0000-4000-8000-000000000010',email:'injected@example.invalid'}))).status).toBe(400);
  expect((await handler()(request({session_id:'x'.repeat(2048)}))).status).toBe(400);
  expect(getAuthorizedRecord).not.toHaveBeenCalled();
 });
 it('requires authorized records and valid, unwithdrawn marketing permission',async()=>{
  for (const record of [null,{...row,marketing_opt_in:false},{...row,marketing_withdrawn_at:row.created_at}]) {
   getAuthorizedRecord.mockResolvedValueOnce(record);
   expect([403,409]).toContain((await handler()(request())).status);
  }
  expect(transport).not.toHaveBeenCalled();
 });
 it('relays only canonical fields and neutralizes spreadsheet formulas',async()=>{
  expect((await handler()(request())).status).toBe(200);
  const payload=JSON.parse(String(transport.mock.calls[0][1]?.body));
  expect(payload.nome).toBe("'=1+1");expect(payload.email).toBe(row.email);
  expect(Object.keys(payload).sort()).toEqual(['cognome','data','email','match','nome','prodotto','store_id']);
 });
 it('reports provider failures instead of returning success',async()=>{
  transport.mockResolvedValueOnce(new Response('failed',{status:500}));
  expect((await handler()(request())).status).toBe(502);
 });
});
describe('SSRF-resistant vendor redirects',()=>{
 it.each(['http://script.google.com/x','https://127.0.0.1/x','https://script.google.com.attacker.invalid/x','https://user:password@script.google.com/x'])('rejects %s',async url=>{
  await expect(sendToSheets(url,{},transport)).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
 });
 it('refuses a redirect to an internal host before making the second request',async()=>{
  transport.mockResolvedValueOnce(new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data/'}}));
  await expect(sendToSheets('https://script.google.com/macros/s/x/exec',{},transport)).rejects.toThrow();expect(transport).toHaveBeenCalledTimes(1);
 });
 it('follows an authorized Apps Script redirect without reposting customer data',async()=>{
  transport.mockResolvedValueOnce(new Response(null,{status:302,headers:{location:'https://script.googleusercontent.com/macros/echo?fixture=1'}}));
  await sendToSheets('https://script.google.com/macros/s/x/exec',{email:row.email},transport);
  expect(transport).toHaveBeenCalledTimes(2);expect(transport.mock.calls[1][1]).toMatchObject({method:'GET',redirect:'manual'});
  expect(transport.mock.calls[1][1]?.body).toBeUndefined();
 });
});
