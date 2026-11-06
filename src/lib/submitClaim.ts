import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Keep one ID/body across retries; a lost response must not create another lead.
export async function submitClaim(requestId: string, payload: Json, signal?: AbortSignal): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) return false;
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    try {
      const controller = new AbortController();
      const { error } = await new Promise<{ error: { code: string } | null }>((resolve, reject) => {
        const finish = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
        const abort = () => { controller.abort(); finish(); reject(new Error('Claim cancelled')); };
        const timer = setTimeout(abort, 8_000);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { abort(); return; }
        const request = supabase.rpc('submit_quiz_session', { p_request_id: requestId, p_payload: payload });
        const cancellable = 'abortSignal' in request ? request.abortSignal(controller.signal) : request;
        Promise.resolve(cancellable).then(value => { finish(); resolve(value); }, reason => { finish(); reject(reason); });
      });
      if (!error) return true;
      if (error.code?.startsWith('22') || ['42501', 'P0001', '23514'].includes(error.code)) return false;
    } catch { /* Transport failure can occur after a committed insert. Retry the same ID. */ }
  }
  return false;
}
