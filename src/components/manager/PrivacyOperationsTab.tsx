import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isValidEmail, isValidName } from '@/lib/validators';
import { fetchAllPages } from '@/lib/pagination';
import { toast } from 'sonner';

interface Task { id: string; email: string | null; provider: string; created_at: string }
interface Status { last_maintenance: string | null; erasure_pending: number; email_reconciliation_pending: number }

/** Manager + MFA are enforced again by RLS/RPCs. External deletion is never implied. */
export function PrivacyOperationsTab() {
  const [email, setEmail] = useState('');
  const [firstName,setFirstName]=useState('');
  const [lastName,setLastName]=useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const [queue, overview] = await Promise.all([
        supabase.from('external_erasure_requests').select('id,email,provider,created_at').eq('status','pending').order('created_at').order('id').limit(50),
        supabase.rpc('privacy_operations_status'),
      ]);
      if (queue.error || overview.error || !overview.data || typeof overview.data !== 'object') throw new Error('Unavailable');
      setTasks(queue.data ?? []); setStatus(overview.data as unknown as Status);
    } catch { setTasks([]); setStatus(null); setError(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const erase = async () => {
    if (busy || !isValidEmail(email) || !window.confirm('Delete this customer’s local sessions? Verify the request first. External copies will need separate confirmation.')) return;
    setBusy(true);
    try {
      const {data,error} = await supabase.rpc('erase_customer_data',{p_email:email.trim()});
      if (error) throw error;
      toast.success(`${data ?? 0} local sessions deleted. Review external tasks below.`);
      setEmail(''); await load();
    } catch { toast.error('Deletion could not be completed.'); }
    finally { setBusy(false); }
  };
  const withdraw = async () => {
    if (busy || !isValidEmail(email) || !window.confirm('Record this verified withdrawal? Stop any external campaigns and reconcile provider suppression separately.')) return;
    setBusy(true);
    try {
      const {data,error} = await supabase.rpc('withdraw_marketing_consent',{p_email:email.trim()});
      if (error) throw error;
      toast.success(`${data ?? 0} local consent records withdrawn. Reconcile external providers before any campaign.`);
      setEmail('');
    } catch { toast.error('Withdrawal could not be recorded.'); }
    finally { setBusy(false); }
  };
  const exportSubject = async () => {
    if (busy || !isValidEmail(email) || !window.confirm('Export only this verified customer’s local records? Protect the downloaded file and verify the delivery channel.')) return;
    setBusy(true);
    try {
      const rows=await fetchAllPages((from,to)=>supabase.rpc('get_customer_records',{p_email:email.trim()},{count:'exact'}).order('id').range(from,to));
      const url=URL.createObjectURL(new Blob([JSON.stringify(rows.map(row=>row.details),null,2)],{type:'application/json'}));
      const link=document.createElement('a');link.href=url;link.download=`suaipe-customer-records-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
      toast.success(`${rows.length} local records exported. Provider records require separate review.`);
    } catch { toast.error('Customer export failed. No complete file was generated.'); }
    finally { setBusy(false); }
  };
  const correctNames = async () => {
    if (busy || !isValidEmail(email) || !isValidName(firstName) || !isValidName(lastName) ||
      !window.confirm('Apply this verified name correction to local records? The email stays unchanged; reconcile external providers separately.')) return;
    setBusy(true);
    try {
      const {data,error}=await supabase.rpc('correct_customer_names',{p_email:email.trim(),p_nome:firstName.trim(),p_cognome:lastName.trim()});
      if(error) throw error;
      toast.success(`${data ?? 0} local records corrected. Reconcile external providers.`);setFirstName('');setLastName('');
    } catch { toast.error('Correction could not be completed.'); }
    finally { setBusy(false); }
  };
  const complete = async (task:Task, notApplicable:boolean) => {
    if (busy || !window.confirm(notApplicable ? 'Confirm this provider never held this customer’s data?' : 'Confirm the provider has completed the deletion, including applicable logs/history?')) return;
    setBusy(true);
    try {
      const {error} = await supabase.rpc('complete_external_erasure',{p_id:task.id,p_not_applicable:notApplicable});
      if (error) throw error;
      await load(); toast.success('Confirmation recorded.');
    } catch { toast.error('Confirmation could not be recorded.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
    <h2 className="font-semibold">Privacy &amp; operations</h2>
    <button disabled={busy} onClick={()=>{void load();}} className="rounded border border-border px-4 py-2 text-sm">Refresh status</button>
    {error && <p role="alert" className="text-destructive">Unable to load protected operations data.</p>}
    {status && <div className="space-y-2 text-sm">
      <p>Last maintenance: {status.last_maintenance ? new Date(status.last_maintenance).toLocaleString() : 'Never run — customer collection unavailable'}</p>
      <p>External deletion tasks pending: {status.erasure_pending}</p>
      <p>Email deliveries requiring reconciliation: {status.email_reconciliation_pending}</p>
      {(!status.last_maintenance || Date.now()-Date.parse(status.last_maintenance)>48*3_600_000) && <p role="alert" className="text-destructive">Maintenance overdue. Contact the technical operator before resuming collection.</p>}
    </div>}
    <div className="space-y-2">
      <label htmlFor="erase-address" className="block text-sm">Verified customer email</label>
      <input id="erase-address" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded border border-border bg-background p-3"/>
      <button disabled={busy || !isValidEmail(email)} onClick={()=>{void erase();}} className="rounded border border-destructive px-4 py-2 text-sm text-destructive">Delete local sessions</button>
      <button disabled={busy || !isValidEmail(email)} onClick={()=>{void withdraw();}} className="ml-2 rounded border border-border px-4 py-2 text-sm">Record marketing withdrawal</button>
      <button disabled={busy || !isValidEmail(email)} onClick={()=>{void exportSubject();}} className="ml-2 rounded border border-border px-4 py-2 text-sm">Export verified customer records</button>
      <div className="mt-3 space-y-2">
        <label className="block text-sm">Corrected first name<input value={firstName} onChange={e=>setFirstName(e.target.value)} maxLength={100} className="mt-1 w-full rounded border border-border bg-background p-3"/></label>
        <label className="block text-sm">Corrected last name<input value={lastName} onChange={e=>setLastName(e.target.value)} maxLength={100} className="mt-1 w-full rounded border border-border bg-background p-3"/></label>
        <button disabled={busy || !isValidEmail(email) || !isValidName(firstName) || !isValidName(lastName)} onClick={()=>{void correctNames();}} className="rounded border border-border px-4 py-2 text-sm">Apply verified name correction</button>
      </div>
    </div>
    <p className="text-xs text-muted-foreground">Local deletion does not erase provider copies. Confirm each task only after verifying deletion with the provider, or verifying that the integration was never used. Oldest 50 pending tasks shown; complete and refresh to load more.</p>
    {tasks.map(task=><div key={task.id} className="space-y-2 rounded border border-border p-3 text-sm">
      <p>{task.provider}: {task.email}</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={()=>{void complete(task,false);}} className="rounded border border-border px-3 py-2">Provider deletion verified</button>
        <button disabled={busy} onClick={()=>{void complete(task,true);}} className="rounded border border-border px-3 py-2">Provider not applicable</button>
      </div>
    </div>)}
  </section>;
}
