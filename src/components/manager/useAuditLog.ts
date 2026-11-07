import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuditLogEntry } from "./managerDashboardUtils";

/**
 * Loads the manager_audit_log into memory whenever the caller flips
 * `enabled` to true (typically when the History tab is opened). Returns
 * the rows + loading/error flags and a manual refetch.
 */
export const useAuditLog = (enabled: boolean) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: queryError } = await supabase
        .from("manager_audit_log")
        .select("id, created_at, action, product_id, old_active, new_active, store_id, user_id, user_email, source")
        .order("created_at", { ascending: false })
        .limit(200);
      if (queryError) {
        setError(true);
      } else {
        setEntries((data ?? []) as AuditLogEntry[]);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (enabled) refetch();
  }, [enabled, refetch]);

  return { entries, loading, error, refetch };
};
