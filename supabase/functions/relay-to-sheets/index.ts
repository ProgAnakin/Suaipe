import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";
import { createRelayHandler, type RelayRecord } from './handler.ts';

const url=Deno.env.get('SUPABASE_URL')??'';
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'';
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(15_000)})}};
serve(createRelayHandler({
 origin:Deno.env.get('ALLOWED_ORIGIN')??'',enabled:Deno.env.get('ENABLE_SHEETS_RELAY')==='true',
 endpoint:Deno.env.get('GOOGLE_SHEETS_WEBHOOK_URL')??'',
 async getAuthorizedRecord(token,id) {
  if (!url || !key) return null;
  const admin=createClient(url,key,options);
  const {data,error}=await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const caller=createClient(url,key,{...options,global:{...options.global,headers:{Authorization:`Bearer ${token}`}}});
  const {error:roleError}=await caller.rpc('list_store_roles_admin');
  if (roleError) return null;
  const {data:record,error:recordError}=await caller.from('quiz_sessions')
   .select('email,nome,cognome,product_name,match_percent,store_id,created_at,marketing_opt_in,marketing_withdrawn_at').eq('id',id).maybeSingle();
  return recordError?null:record as RelayRecord|null;
 },
}));
