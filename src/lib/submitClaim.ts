import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Keep one ID/body across retries; a lost response must not create another lead.
export async function submitClaim(requestId: string, payload: Json): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    try {
      const { error } = await supabase.rpc('submit_quiz_session', { p_request_id: requestId, p_payload: payload });
      if (!error) return true;
      if (['22023', '42501', 'P0001', '23514'].includes(error.code)) return false;
    } catch { /* Transport failure can occur after a committed insert. Retry the same ID. */ }
  }
  return false;
}
