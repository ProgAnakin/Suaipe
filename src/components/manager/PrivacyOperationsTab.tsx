import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isValidEmail } from '@/lib/validators';
import { toast } from 'sonner';

interface Task { id: string; email: string | null; provider: string; created_at: string }
interface Status { last_maintenance: string | null; erasure_pending: number; email_reconciliation_pending: number }

/** Manager + MFA are enforced again by RLS/RPCs. External deletion is never implied. */
export function PrivacyOperationsTab() {
  const [email, setEmail] = useState('');
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
      <label htmlFor="erase-address" className="block text-sm">Verified customer deletion request</label>
      <input id="erase-address" type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded border border-border bg-background p-3"/>
      <button disabled={busy || !isValidEmail(email)} onClick={()=>{void erase();}} className="rounded border border-destructive px-4 py-2 text-sm text-destructive">Delete local sessions</button>
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
