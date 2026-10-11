import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { products as bundledProducts } from "@/data/products";
import { toCsv, downloadTextFile } from "@/lib/csv";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { ilikeAny } from "@/lib/postgrestFilter";
import { endOfLocalDayISO, startOfLocalDayISO } from "@/lib/dayRange";
import { getCodeTtlMs } from "../EmailTemplateTab";
import {
  formatDate,
  isCodeExpired,
  sessionProductName,
  Session,
  SessionKpi,
  SESSION_SELECT,
  StatusFilter,
  storeName,
} from "./types";

const PAGE_SIZE = 20;
/** A session younger than this has not had time to receive its e-mail yet: "processing", not "failed". */
const PROCESSING_WINDOW_MS = 5 * 60_000;

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

  // Options of the "product" filter: the live catalogue (what the store really sells), not the
  // bundled demo products.
  const [productOptions, setProductOptions] = useState<{ id: string; name: string }[]>(
    () => bundledProducts.map((p) => ({ id: p.id, name: p.name })),
  );
  useEffect(() => {
    let alive = true;
    supabase.from("custom_products").select("id, name").order("name").then(({ data }) => {
      if (alive && data && data.length > 0) setProductOptions(data as { id: string; name: string }[]);
    });
    return () => { alive = false; };
  }, []);

  // ── Fetchers ────────────────────────────────────────────────────────────
  // The KPI cards are computed from the rows themselves, so they need ALL of them: PostgREST
  // answers at most 1000 rows per request, which used to freeze the totals at 1000.
  const fetchKpiData = useCallback(async () => {
    const { rows, error } = await fetchAllPages<SessionKpi>((from, to) => {
      let q = supabase
        .from("quiz_sessions")
        .select("id, email_sent, discount_code, created_at, code_redeemed")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
      if (!isGlobal) q = q.eq("store_id", storeId);
      return q;
    });
    if (error) { console.error("[suaipe] KPI fetch failed:", error.message); return; } // keep the last good numbers
    setKpiData(rows);
  }, [storeId, isGlobal]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const from = (currentPage - 1) * PAGE_SIZE;

    let query = supabase
      .from("quiz_sessions")
      .select(SESSION_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!isGlobal) query = query.eq("store_id", storeId);
    const search = ilikeAny(["email", "discount_code", "nome", "cognome"], debouncedSearch);
    if (search) query = query.or(search);
    if (filterDateFrom) query = query.gte("created_at", startOfLocalDayISO(filterDateFrom));
    if (filterDateTo) query = query.lte("created_at", endOfLocalDayISO(filterDateTo));
    if (filterProductId) query = query.eq("matched_product_id", filterProductId);
    if (filterMatchMin) query = query.gte("match_percent", parseInt(filterMatchMin, 10));
    if (filterMatchMax) query = query.lte("match_percent", parseInt(filterMatchMax, 10));
    // The status is applied by the DATABASE, so the pager and the total agree with it — filtering
    // the 20 rows of the current page hid every "failed" session that was not on that page.
    if (statusFilter !== "all") {
      const processingCutoff = new Date(Date.now() - PROCESSING_WINDOW_MS).toISOString();
      if (statusFilter === "sent") query = query.eq("email_sent", true);
      else {
        query = query.eq("email_sent", false);
        if (statusFilter === "processing") query = query.gte("created_at", processingCutoff);
        else query = query.lt("created_at", processingCutoff).filter("discount_code", statusFilter === "no_email" ? "not.is" : "is", null);
      }
    }

    const { data, count } = await query;
    setSessions((data ?? []) as Session[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [storeId, isGlobal, currentPage, debouncedSearch, statusFilter, filterDateFrom, filterDateTo, filterProductId, filterMatchMin, filterMatchMax]);

  const fetchNegado = useCallback(async () => {
    const count = (type: "result_shown" | "claimed") => {
      let q = supabase.from("quiz_funnel_events").select("*", { count: "exact", head: true }).eq("event_type", type);
      if (!isGlobal) q = q.eq("store_id", storeId); // a store's dashboard counts that store only
      return q;
    };
    const [shownRes, claimedRes] = await Promise.all([count("result_shown"), count("claimed")]);
    const negado = (shownRes.count ?? 0) - (claimedRes.count ?? 0);
    setNegadoCount(Math.max(0, negado));
  }, [storeId, isGlobal]);

  // ── Realtime subscription — refetch on any session change ──────────────
  useEffect(() => {
    // A burst of changes (several customers at once, a purge) refreshes once, not once per row.
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ch = supabase
      .channel("sessions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions" }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { fetchSessions(); fetchKpiData(); }, 600);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(ch); };
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
      toast.error("0 rows updated — check the SQL function.");
    } else if (error) {
      toast.error(`Error: ${error.message}`);
    }
    setRedeemingId(null);
  }, [redeemingId]);

  const exportToCSV = useCallback(async () => {
    setExporting(true);
    // every session, page by page — one plain select would stop at 1000 rows and the file would be
    // presented as complete
    const { rows, truncated, error } = await fetchAllPages<Session>((from, to) => {
      let q = supabase
        .from("quiz_sessions")
        .select(SESSION_SELECT)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to);
      if (!isGlobal) q = q.eq("store_id", storeId);
      return q;
    });
    if (error) {
      setExporting(false);
      toast.error(`Export failed: ${error.message}`);
      return;
    }

    const headers = ["First Name", "Last Name", "Email", "Product", "Match %", "Store", "Date", "Discount Code", "Code Status", "Used At"];
    const csvRows = rows.map((s) => [
      s.nome ?? "", s.cognome ?? "", s.email,
      sessionProductName(s), s.match_percent,
      storeName(s.store_id), formatDate(s.created_at),
      s.discount_code ?? "",
      s.code_redeemed ? "used" : isCodeExpired(s) ? "expired" : s.discount_code ? "valid" : "no code",
      s.code_redeemed_at ? formatDate(s.code_redeemed_at) : "",
    ]);

    downloadTextFile(`suaipe-sessions-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([headers, ...csvRows]));
    if (truncated) toast.warning(`${rows.length} sessions exported — the export stops at ${rows.length}; narrow it by store or date for the rest.`);
    else toast.success(`${rows.length} sessions exported to CSV.`);
    setExporting(false);
  }, [storeId, isGlobal]);

  const openPurgeModal = useCallback(async () => {
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
    // A store responsible may only purge their own store (the database enforces it); a manager's
    // dashboard is global, so no store is named and every store is purged — as the preview says.
    const { data, error } = await supabase.rpc("purge_sessions_older_than", isGlobal ? { p_days: 7 } : { p_days: 7, p_store_id: storeId });
    setPurging(false);
    setShowPurgeModal(false);
    if (error) {
      toast.error(`Could not delete the old sessions: ${error.message}`);
      return;
    }
    const deleted = data ?? 0;
    toast.success(`${deleted} sessions deleted successfully.`);
    fetchSessions();
    fetchKpiData();
    fetchNegado();
  }, [fetchSessions, fetchKpiData, fetchNegado, isGlobal, storeId]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);

  const counts = {
    all:         kpiData.length,
    sent:        kpiData.filter((s) => s.email_sent).length,
    processing:  kpiData.filter((s) => {
      if (s.email_sent) return false;
      return (Date.now() - new Date(s.created_at).getTime()) / 60_000 < 5;
    }).length,
    no_email:    kpiData.filter((s) => {
      if (s.email_sent) return false;
      if (!s.discount_code) return false;
      return (Date.now() - new Date(s.created_at).getTime()) / 60_000 >= 5;
    }).length,
    failed:      kpiData.filter((s) => !s.email_sent && !s.discount_code).length,
  };

  const expiredReusable = kpiData.filter(
    (s) => (Date.now() - new Date(s.created_at).getTime()) > getCodeTtlMs()
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
    refreshAll, productOptions,
  };
}
