// PIN checks always use the persistent server-side origin limiter.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { readBoundedJson } from "../_shared/request.ts";
const STAFF_PIN = Deno.env.get("STAFF_PIN") ?? "";
const URL = Deno.env.get("SUPABASE_URL") ?? "";
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "";
function equal(a: string,b: string): boolean {
 let difference = a.length ^ b.length;
 for (let i=0;i<Math.max(a.length,b.length);i++) difference |= (a.charCodeAt(i)||0) ^ (b.charCodeAt(i)||0);
 return difference===0;
}
serve(async req => {
 const origin = req.headers.get("origin") ?? "";
 const headers: Record<string,string> = { "Content-Type":"application/json", "Access-Control-Allow-Methods":"POST, OPTIONS", "Access-Control-Allow-Headers":"Content-Type, Authorization, apikey, x-client-info", "Vary":"Origin" };
 if (ORIGIN && origin===ORIGIN) headers["Access-Control-Allow-Origin"]=origin;
 const deny = () => new Response(JSON.stringify({valid:false,locked_seconds:0}),{status:403,headers});
 if (origin && origin!==ORIGIN) return deny();
 if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if (req.method!=='POST' || !URL || !KEY) return deny();
 // This deployment must sit behind Supabase's gateway, which must replace XFF.
 // Never deploy directly to an endpoint that trusts caller-supplied IP headers.
 // Use the trusted tail appended/replaced by the gateway, never a caller prefix.
 const ip = req.headers.get("x-forwarded-for")?.split(',').map(value=>value.trim()).filter(Boolean).at(-1);
 if (!ip) return deny();
 let body: Record<string,unknown>;
 try { body = await readBoundedJson(req,4096) as Record<string,unknown>; } catch { return deny(); }
 if (!body || typeof body.pin_input!=='string' || body.pin_input.length>64) return deny();
 const {data,error} = await createClient(URL,KEY).rpc("verify_staff_pin_server",{
   pin_input:body.pin_input,client_id:String(body.client_id ?? 'edge').slice(0,100),
   user_agent:String(body.user_agent ?? '').slice(0,500),ip_address:ip,
   p_secret_valid:STAFF_PIN ? equal(body.pin_input,STAFF_PIN) : null,
 });
 if (error) return new Response(JSON.stringify({valid:false,locked_seconds:0}),{status:503,headers});
 return new Response(JSON.stringify(data),{headers});
});
