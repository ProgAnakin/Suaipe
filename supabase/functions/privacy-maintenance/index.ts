import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

// Daily scheduler endpoint. Credential goes in a header, never a query string.
const secret = Deno.env.get('MAINTENANCE_SECRET') ?? '';
serve(async req => {
 const supplied = req.headers.get('x-maintenance-secret') ?? '';
 let difference = supplied.length ^ secret.length;
 for (let i=0;i<Math.max(supplied.length,secret.length);i++) difference |= (supplied.charCodeAt(i)||0)^(secret.charCodeAt(i)||0);
 if (!['GET','POST'].includes(req.method) || !secret || difference) return new Response('Unauthorized',{status:401});
 const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if (!url || !key) return new Response('Service unavailable',{status:503});
 const {data,error}=await createClient(url,key).rpc(req.method==='GET'?'operations_health':'run_privacy_maintenance');
 if (error) return new Response('Maintenance failed',{status:503});
 if (!data || typeof data!=='object' || typeof data.email_reconciliation_pending!=='number' || typeof data.external_erasure_pending!=='number'
  || (req.method==='GET' && typeof data.maintenance_overdue!=='boolean')
  || (req.method==='POST' && typeof data.sessions_deleted!=='number')) return new Response('Invalid service response',{status:503});
 const stats={sessions_deleted:Number(data?.sessions_deleted ?? 0),external_erasure_pending:Number(data?.external_erasure_pending ?? 0),email_reconciliation_pending:Number(data?.email_reconciliation_pending ?? 0),maintenance_overdue:Boolean(data?.maintenance_overdue)};
 console.log(JSON.stringify({event:req.method==='GET'?'operations_health':'privacy_maintenance',...stats})); // Whitelisted aggregates only.
 return new Response(JSON.stringify(stats),{headers:{'Content-Type':'application/json'}});
});
