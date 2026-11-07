import { readBoundedJson } from '../_shared/request.ts';
import { spreadsheetText } from '../_shared/contentSafety.ts';
import { sendToSheets } from '../_shared/googleSheets.ts';
export interface RelayRecord {
  email:string;nome:string|null;cognome:string|null;product_name:string|null;
  match_percent:number;store_id:string|null;created_at:string;
  marketing_opt_in:boolean;marketing_withdrawn_at:string|null;
}
interface Dependencies {
  origin:string;enabled:boolean;endpoint:string;
  getAuthorizedRecord:(token:string,id:string)=>Promise<RelayRecord|null>;
  transport?:typeof fetch;
}
export function createRelayHandler(deps:Dependencies) {
  return async (req:Request):Promise<Response> => {
    const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':deps.origin,
      'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, apikey, x-client-info','Vary':'Origin'};
    const reply=(status:number,message:string)=>new Response(JSON.stringify({ok:status===200,message}),{status,headers});
    if (!deps.origin || deps.origin==='*') return reply(503,'Service unavailable');
    if (req.headers.get('origin') && req.headers.get('origin')!==deps.origin) return reply(403,'Forbidden');
    if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (req.method!=='POST') return reply(405,'Method not allowed');
    if (!deps.enabled || !deps.endpoint) return reply(503,'Relay disabled');
    const token=req.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return reply(401,'Authentication required');
    let body:unknown;
    try { body=await readBoundedJson(req,1024); } catch { return reply(400,'Invalid request'); }
    if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>k!=='session_id') ||
      !('session_id' in body) || typeof body.session_id!=='string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.session_id)) return reply(400,'Invalid session');
    try {
      const record=await deps.getAuthorizedRecord(token,body.session_id);
      if (!record) return reply(403,'Forbidden');
      if (!record.marketing_opt_in || record.marketing_withdrawn_at) return reply(409,'Marketing permission unavailable');
      const safe=Object.fromEntries(Object.entries({data:record.created_at,nome:record.nome??'',cognome:record.cognome??'',email:record.email,
        prodotto:record.product_name??'',match:`${record.match_percent}%`,store_id:record.store_id??''})
        .map(([key,value])=>[key,spreadsheetText(value.slice(0,500))]));
      await sendToSheets(deps.endpoint,safe,deps.transport);
      return reply(200,'Relayed');
    } catch { return reply(502,'Relay unavailable'); }
  };
}
