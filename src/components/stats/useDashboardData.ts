import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { endOfLocalDayISO, startOfLocalDayISO } from "@/lib/dayRange";
import { fetchAllPages } from "@/lib/fetchAllPages";
import type { FunnelCounts, QuizSession } from "./types";

/** Safety cap on the sessions read for the charts (50 pages of 1000). */
const MAX_SESSIONS = 50_000;
const REFRESH_DEBOUNCE_MS = 3000;

interface DashboardDataOptions {
  dateFrom: string;
  dateTo: string;
  filterStore: string | null;
  dateRangeInvalid: boolean;
}

/**
 * Pulls quiz_sessions (server-side filtered by date + store, page by page — PostgREST answers at
 * most 1000 rows per request, which used to cut every chart at 1000 sessions) and the three
 * funnel event counts for THE SAME store and dates. The manual refresh is debounced so a frantic
 * click on Refresh doesn't hammer Supabase.
 */
export const useDashboardData = ({ dateFrom, dateTo, filterStore, dateRangeInvalid }: DashboardDataOptions) => {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [funnel, setFunnel] = useState<FunnelCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  /** more sessions exist than were read (MAX_SESSIONS): the charts cover the newest ones only */
  const [truncated, setTruncated] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual && Date.now() - lastFetchRef.current < REFRESH_DEBOUNCE_MS) return;
    lastFetchRef.current = Date.now();
    setLoading(true);
    setHasError(false);

    if (dateRangeInvalid) { setLoading(false); return; }

    const { rows, truncated: cut, error } = await fetchAllPages<QuizSession>((from, to) => {
      let q = supabase
        .from("quiz_sessions")
        .select("id, email, nome, cognome, matched_product_id, product_name, match_percent, created_at, store_id, email_sent, discount_code, code_redeemed")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
      if (dateFrom) q = q.gte("created_at", startOfLocalDayISO(dateFrom));
      if (dateTo)   q = q.lte("created_at", endOfLocalDayISO(dateTo));
      if (filterStore) q = q.eq("store_id", filterStore);
      return q;
    }, { maxRows: MAX_SESSIONS });
    if (error) setHasError(true);
    else { setSessions(rows); setTruncated(cut); }

    // The funnel follows the same store and dates as everything else on the page — a store's
    // claim rate computed from every store's events says nothing about that store. Wrapped so a
    // network rejection here can't abort the dashboard and leave it stuck on the loading spinner.
    try {
      const count = (type: "quiz_started" | "result_shown" | "claimed") => {
        let q = supabase.from("quiz_funnel_events").select("*", { count: "exact", head: true }).eq("event_type", type);
        if (dateFrom) q = q.gte("created_at", startOfLocalDayISO(dateFrom));
        if (dateTo)   q = q.lte("created_at", endOfLocalDayISO(dateTo));
        if (filterStore) q = q.eq("store_id", filterStore);
        return q;
      };
      const [startedRes, resultRes, claimedRes] = await Promise.all([count("quiz_started"), count("result_shown"), count("claimed")]);
      setFunnel({
        started:     startedRes.count ?? 0,
        resultShown: resultRes.count  ?? 0,
        claimed:     claimedRes.count ?? 0,
      });
    } catch (err) {
      console.error("[suaipe] funnel counts fetch failed:", err);
    }

    setLoading(false);
  }, [dateFrom, dateTo, filterStore, dateRangeInvalid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { sessions, funnel, loading, hasError, truncated, refetch: fetchData };
};
