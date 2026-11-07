// Native Deno tests. No SDK/gateway/provider emulation is presented as live evidence.
import { readBoundedJson } from '../functions/_shared/request.ts';
import { createRelayHandler } from '../functions/relay-to-sheets/handler.ts';
import { sendToSheets } from '../functions/_shared/googleSheets.ts';
const assert=(ok:unknown)=>{if (!ok) throw new Error('Assertion failed');};
Deno.test('request limit rejects a streaming body even when cancellation never resolves',async()=>{
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array(200));},cancel(){return new Promise(()=>{});}});
 let refused=false;
 try {await readBoundedJson(new Request('https://fixture.invalid',{method:'POST',body:stream}),100);} catch {refused=true;}
 assert(refused);
});
Deno.test('unauthenticated relay never loads records or contacts a provider',async()=>{
 let invoked=false;
 const handler=createRelayHandler({origin:'https://portfolio.example',enabled:true,endpoint:'https://script.google.com/macros/s/x/exec',getAuthorizedRecord:()=>{invoked=true;return Promise.resolve(null);}});
 const result=await handler(new Request('https://fixture.invalid',{method:'POST',body:'{}'}));
 assert(result.status===401 && !invoked);
});
Deno.test('vendor redirect to metadata service is refused before a second request',async()=>{
 let calls=0,refused=false;
 const transport:typeof fetch=()=>{calls++;return Promise.resolve(new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data/'}}));};
 try {await sendToSheets('https://script.google.com/macros/s/x/exec',{},transport);} catch {refused=true;}
 assert(refused && calls===1);
});
