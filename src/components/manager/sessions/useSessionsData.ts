import { createCsv } from "@/lib/csv";
import { fetchAllPages } from "@/lib/pagination";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

import {
  formatDate,
  isCodeExpired,
  productName,
  Session,
  SessionKpi,
  SESSION_SELECT,
  StatusFilter,
  storeName,
} from "./types";

const PAGE_SIZE = 20;

interface UseSessionsDataOpts {
  storeId: string;
  isGlobal: boolean;
}

export function useSessionsData({ storeId, isGlobal }: UseSessionsDataOpts) {
  // ── List + pagination state ──────────────────────────────────────────────
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [kpiData, setKpiData]         = useState<SessionKpi[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [loading, setLoading]         = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [negadoCount, setNegadoCount] = useState(0);

  // ── Filters ─────────────────────────────────────────────────────────────
  const [search, setSearch]                 = useState("");
  const debouncedSearch                     = useDebounce(search, 300);
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>("all");
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo]     = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [filterMatchMin, setFilterMatchMin] = useState("");
  const [filterMatchMax, setFilterMatchMax] = useState("");

  // ── Inline UI state ─────────────────────────────────────────────────────
  const [copiedCode, setCopiedCode]                 = useState<string | null>(null);
  const [redeemingId, setRedeemingId]               = useState<string | null>(null);
  const [exporting, setExporting]                   = useState(false);
  const [showPurgeModal, setShowPurgeModal]         = useState(false);
  const [purging, setPurging]                       = useState(false);
  const [purgePreviewCount, setPurgePreviewCount]   = useState<number | null>(null);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetchers ────────────────────────────────────────────────────────────
  const buildQuery = useCallback((includeStatus = true) => {
    let query = supabase.from("quiz_sessions").select(SESSION_SELECT, { count: "exact" })
      .order("created_at", { ascending: false }).order("id");
    if (!isGlobal) query = query.eq("store_id", storeId);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().replace(/[^\p{L}\p{N}@. -]/gu, "");
      if (q) query = query.or(`email.ilike.%${q}%,discount_code.ilike.%${q}%,nome.ilike.%${q}%,cognome.ilike.%${q}%`);
    }
    if (filterDateFrom) query = query.gte("created_at", new Date(filterDateFrom).toISOString());
    if (filterDateTo) query = query.lt("created_at", new Date(new Date(filterDateTo).getTime() + 86_400_000).toISOString());
    if (filterProductId) query = query.eq("matched_product_id", filterProductId);
    if (filterMatchMin) query = query.gte("match_percent", Number(filterMatchMin));
    if (filterMatchMax) query = query.lte("match_percent", Number(filterMatchMax));
    if (includeStatus && statusFilter === "sent") query = query.eq("email_sent", true);
    if (includeStatus && statusFilter === "processing") query = query.in("email_status", ["pending", "sending"]);
    if (includeStatus && statusFilter === "no_email") query = query.in("email_status", ["uncertain", "suppressed"]);
    if (includeStatus && statusFilter === "failed") query = query.eq("email_status", "failed");
    return query;
  }, [isGlobal, storeId, debouncedSearch, filterDateFrom, filterDateTo, filterProductId, filterMatchMin, filterMatchMax, statusFilter]);

  const fetchKpiData = useCallback(async () => {
    try {
      const snapshot = new Date().toISOString();
      const rows = await fetchAllPages((from,to) => buildQuery(false).lte("created_at", snapshot).range(from,to));
      setKpiData(rows as SessionKpi[]);
    } catch { setKpiData([]); toast.error("Session totals could not be loaded."); }
  }, [buildQuery]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * PAGE_SIZE;
      const { data, count, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      setSessions((data ?? []) as Session[]);
      setTotalCount(count ?? 0);
    } catch { setSessions([]); setTotalCount(0); toast.error("Sessions could not be loaded."); }
    finally { setLoading(false); }
  }, [buildQuery, currentPage]);

  const fetchNegado = useCallback(async () => {
    const [shownRes, claimedRes] = await Promise.all([
      supabase.from("quiz_funnel_events").select("*", { count: "exact", head: true }).eq("event_type", "result_shown").in("store_id", isGlobal ? ["lisboa", "milano", "dublino", "rio-de-janeiro"] : [storeId]),
      supabase.from("quiz_funnel_events").select("*", { count: "exact", head: true }).eq("event_type", "claimed").in("store_id", isGlobal ? ["lisboa", "milano", "dublino", "rio-de-janeiro"] : [storeId]),
    ]);
    const negado = (shownRes.count ?? 0) - (claimedRes.count ?? 0);
    setNegadoCount(Math.max(0, negado));
  }, [storeId, isGlobal]);

  // ── Realtime subscription — refetch on any session change ──────────────
  useEffect(() => {
    const ch = supabase
      .channel("sessions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions" }, () => {
        fetchSessions();
        fetchKpiData();
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [fetchSessions, fetchKpiData]);

  useEffect(() => { fetchKpiData(); fetchNegado(); }, [fetchKpiData, fetchNegado]);
  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  // Reset to page 1 when any filter changes
  useEffect(
    () => { setCurrentPage(1); },
    [debouncedSearch, statusFilter, filterDateFrom, filterDateTo, filterProductId, filterMatchMin, filterMatchMax],
  );

  // ── Mutations ───────────────────────────────────────────────────────────
  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast.success("Code copied!");
    } catch { /* clipboard unavailable */ }
  }, []);

  const markRedeemed = useCallback(async (s: Session) => {
    if (redeemingId) return;
    setRedeemingId(s.id);
    const { data: rowsUpdated, error } = await supabase.rpc("mark_code_redeemed", { p_session_id: s.id });
    if (!error && (rowsUpdated ?? 0) > 0) {
      setSessions((prev) =>
        prev.map((row) =>
          row.id === s.id
            ? { ...row, code_redeemed: true, code_redeemed_at: new Date().toISOString() }
            : row,
        ),
      );
      setKpiData((prev) =>
        prev.map((row) => (row.id === s.id ? { ...row, code_redeemed: true } : row)),
      );
      toast.success("Code marked as used.");
    } else if (!error && (rowsUpdated as number) === 0) {
      toast.error("Code unavailable, expired, already redeemed or outside your store.");
    } else if (error) {
      toast.error(`Error: ${error.message}`);
    }
    setRedeemingId(null);
  }, [redeemingId]);

  const exportToCSV = useCallback(async () => {
    setExporting(true);
    try {
      const snapshot = new Date().toISOString();
      const rows = await fetchAllPages((from,to) => buildQuery().lte("created_at", snapshot).range(from,to)) as Session[];
      const headers = ["First Name", "Last Name", "Email", "Product", "Match %", "Store", "Date", "Discount Code", "Code Status", "Used At"];
      const csvRows = rows.map((s) => [s.nome, s.cognome, s.email, productName(s.matched_product_id, s.product_name), s.match_percent,
        storeName(s.store_id), formatDate(s.created_at), s.discount_code,
        s.code_redeemed ? "used" : !s.discount_code ? "no code" : isCodeExpired(s) ? "expired" : !s.email_sent ? "not issued" : "valid",
        s.code_redeemed_at ? formatDate(s.code_redeemed_at) : ""]);
      const blob = new Blob([createCsv([headers, ...csvRows])], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `suaipe-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      toast.success(`${rows.length} sessions exported to CSV.`);
    } catch { toast.error("Export failed. No complete file was generated. Try a smaller date range."); }
    finally { setExporting(false); }
  }, [buildQuery]);

  const openPurgeModal = useCallback(async () => {
    if (!isGlobal) { toast.error("Only managers may delete sessions."); return; }
    setPurgePreviewCount(null);
    setShowPurgeModal(true);
    let query = supabase
      .from("quiz_sessions")
      .select("id", { count: "exact", head: true })
      .lt("created_at", new Date(Date.now() - 7 * 24 * 3_600_000).toISOString());
    if (!isGlobal) query = query.eq("store_id", storeId);
    const { count } = await query;
    setPurgePreviewCount(count ?? 0);
  }, [storeId, isGlobal]);

  const executePurge = useCallback(async () => {
    setPurging(true);
    const { data, error } = await supabase.rpc("purge_sessions_older_than", { p_days: 7 });
    setPurging(false);
    setShowPurgeModal(false);
    if (error) { toast.error("Sessions could not be deleted."); return; }
    const deleted = data ?? 0;
    toast.success(`${deleted} sessions deleted successfully.`);
    fetchSessions();
    fetchKpiData();
    fetchNegado();
  }, [fetchSessions, fetchKpiData, fetchNegado]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);

  const counts = {
    all:         kpiData.length,
    sent:        kpiData.filter((s) => s.email_sent).length,
    processing: kpiData.filter(s => !s.email_sent && ['pending','sending'].includes(s.email_status ?? 'pending')).length,
    no_email: kpiData.filter(s => !s.email_sent && ['uncertain','suppressed'].includes(s.email_status ?? '')).length,
    failed: kpiData.filter(s => !s.email_sent && s.email_status === 'failed').length,
  };

  const expiredReusable = kpiData.filter(
    (s) => Date.now() >= Date.parse(s.expires_at)
      && s.discount_code && !s.code_redeemed,
  ).length;

  const redemptionTotal = kpiData.filter((s) => s.discount_code !== null).length;
  const redemptionUsed  = kpiData.filter((s) => s.code_redeemed === true).length;
  const redemptionPct   = redemptionTotal > 0 ? Math.round((redemptionUsed / redemptionTotal) * 100) : 0;
  const localNegado     = kpiData.filter((s) => !s.email_sent && !s.discount_code).length;

  const hasAdvancedFilter = !!(filterDateFrom || filterDateTo || filterProductId || filterMatchMin || filterMatchMax);

  const clearAdvanced = useCallback(() => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterProductId("");
    setFilterMatchMin("");
    setFilterMatchMax("");
  }, []);

  const refreshAll = useCallback(() => {
    fetchSessions();
    fetchKpiData();
    fetchNegado();
  }, [fetchSessions, fetchKpiData, fetchNegado]);

  return {
    // data
    sessions, kpiData, totalCount, loading, negadoCount,
    // pagination
    currentPage, setCurrentPage, totalPages, safePage, pageSize: PAGE_SIZE,
    // filters
    search, setSearch,
    statusFilter, setStatusFilter,
    showAdvanced, setShowAdvanced,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterProductId, setFilterProductId,
    filterMatchMin, setFilterMatchMin,
    filterMatchMax, setFilterMatchMax,
    hasAdvancedFilter, clearAdvanced,
    // derived
    counts, expiredReusable, redemptionUsed, redemptionTotal, redemptionPct, localNegado,
    // mutations
    copiedCode, copyCode,
    redeemingId, markRedeemed,
    exporting, exportToCSV,
    // purge
    showPurgeModal, setShowPurgeModal, purging, purgePreviewCount,
    openPurgeModal, executePurge,
    // refresh
    refreshAll,
  };
}
