import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/clientId";
import { IS_DEMO } from '@/config/demo';

export interface PinResult {
  valid: boolean;
  locked_seconds: number;
}

// Fail closed when Edge verification is unavailable. No public SQL fallback.
export async function verifyStaffPin(pin: string): Promise<PinResult | null> {
  if (IS_DEMO) return null;
  try {
    const { data, error } = await supabase.functions.invoke("verify-pin", {
      body: { pin_input: pin, client_id: getClientId(), user_agent: navigator.userAgent },
      signal: AbortSignal.timeout(10_000),
    });
    return !error && typeof data?.valid === 'boolean' ? data as PinResult : null;
  } catch { return null; }
}
