import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStoreById } from "@/data/stores";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { StatCard } from "./StatCard";
import { MfaSetupModal } from "./MfaSetupModal";
import { GdprExportConfirm } from "./GdprExportConfirm";
import { DashboardFilterPanel } from "./DashboardFilterPanel";
import { DashboardHeader } from "./DashboardHeader";
import { SessionsList } from "./SessionsList";
import { ProductLeaderboard } from "./charts/ProductLeaderboard";
import { SevenDayChart, HourlyDistribution } from "./charts/TimeCharts";
import { MatchHistogram } from "./charts/MatchHistogram";
import { FunnelChart } from "./charts/FunnelChart";
import { useDashboardFilters } from "./useDashboardFilters";
import { useDashboardData } from "./useDashboardData";
import { useDashboardMetrics } from "./useDashboardMetrics";
import { exportCSV, sessionProductName } from "./types";

interface DashboardProps {
  onLogout: () => void;
}

export const Dashboard = ({ onLogout }: DashboardProps) => {
  const navigate = useNavigate();
  useIdleLogout(onLogout);

  const filters = useDashboardFilters();
  const { dateFrom, dateTo, filterStore, isFiltered, dateRangeInvalid } = filters;

  const data = useDashboardData({ dateFrom, dateTo, filterStore, dateRangeInvalid });
  const { sessions, funnel, loading, hasError, truncated } = data;

  // Server already filtered by date + store — client-side filtering only adds
  // text search across email / product / name on top of the fetched page.
  const filteredSessions = sessions;
  const metrics = useDashboardMetrics(filteredSessions);
  const globalTotal = sessions.length;

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [productPage, setProductPage] = useState(0);
  const [search, setSearch] = useState("");
  const [hasMfa, setHasMfa] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setHasMfa((data?.totp?.filter((f) => f.status === "verified")?.length ?? 0) > 0);
    });
  }, []);

  // Reset pagination whenever the underlying selection changes.
  useEffect(() => { setPage(0); setProductPage(0); }, [dateFrom, dateTo, filterStore]);
  useEffect(() => { setPage(0); }, [search]);

  const searchedSessions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return filteredSessions;
    return filteredSessions.filter((s) => {
      const name = `${s.nome ?? ""} ${s.cognome ?? ""}`.toLowerCase();
      return (
        s.email.toLowerCase().includes(q) ||
        sessionProductName(s).toLowerCase().includes(q) ||
        name.includes(q)
      );
    });
  }, [filteredSessions, search]);

  // Conversion rate (claim rate) — derived from the funnel counts of the selected store and dates.
  const tassoClaimPct = funnel && funnel.resultShown > 0
    ? Math.round((funnel.claimed / funnel.resultShown) * 100)
    : null;
  const tassoClaimColor: "green" | "amber" | "red" =
    tassoClaimPct == null ? "red"
    : tassoClaimPct > 30 ? "green"
    : tassoClaimPct >= 15 ? "amber"
    : "red";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };
  const handleExportConfirm = () => {
    setConfirmExport(false);
    exportCSV(filteredSessions, dateFrom || undefined, dateTo || undefined);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">

        <DashboardHeader
          isFiltered={isFiltered}
          showFilters={showFilters}
          exportDisabled={filteredSessions.length === 0}
          hasMfa={hasMfa}
          onRefresh={() => data.refetch(true)}
          onToggleFilters={() => setShowFilters((v) => !v)}
          onExport={() => setConfirmExport(true)}
          onOpenCatalog={() => navigate("/manager")}
          onOpenMfa={() => setShowMfaModal(true)}
          onLogout={handleLogout}
          onBackToQuiz={() => { supabase.auth.signOut(); navigate("/"); }}
        />

        <DashboardFilterPanel
          open={showFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          filterStore={filterStore}
          dateRangeInvalid={dateRangeInvalid}
          isFiltered={isFiltered}
          filteredCount={filteredSessions.length}
          globalTotal={globalTotal}
          setDateFrom={filters.setDateFrom}
          setDateTo={filters.setDateTo}
          setFilterStore={filters.setFilterStore}
          clearAll={filters.clearAll}
        />

        {dateRangeInvalid && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center">
            <p className="text-sm font-medium text-destructive">
              End date must be ≥ start date. Correct the filter to view the data.
            </p>
          </div>
        )}

        {loading && !dateRangeInvalid && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted/40 rounded-2xl h-28" />
              ))}
            </div>
            <div className="animate-pulse bg-muted/40 rounded-2xl h-40" />
            <div className="animate-pulse bg-muted/40 rounded-2xl h-40" />
          </div>
        )}

        {hasError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">Unable to load data. Try again or contact the administrator.</p>
            <button onClick={() => data.refetch(true)} className="mt-3 text-xs text-primary underline">Retry</button>
          </div>
        )}

        {!loading && !hasError && !dateRangeInvalid && (
          <>
            {truncated && (
              <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
                More sessions exist than can be charted at once — the figures below cover the {sessions.length.toLocaleString("en-GB")} most
                recent ones. Narrow the date range or pick a store for exact numbers.
              </div>
            )}
            {/* KPI cards */}
            <motion.div
              className="grid grid-cols-2 gap-4"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            >
              <StatCard
                label="Total sessions"
                value={metrics.total}
                trend={null}
                sub={filterStore
                  ? `${getStoreById(filterStore)?.shortName} · ${globalTotal} global`
                  : (isFiltered ? "in this period" : undefined)}
              />
              <StatCard label="Emails collected" value={metrics.uniqueEmails} trend={null} sub={isFiltered ? "in this period" : undefined} />
              <StatCard label="Average match" value={`${metrics.avgMatch}%`} trend={null} />
              <StatCard label="Today" value={metrics.todaySessions} sub="sessions" />
              <StatCard label="Emails delivered" value={`${metrics.emailDeliveryRate}%`} sub={`${metrics.emailSentCount} / ${metrics.total}`} />
              <StatCard label="Returning visitors" value={metrics.returningCount} sub="duplicate emails" />

              {tassoClaimPct !== null && (
                <StatCard label="Claim rate" value={`${tassoClaimPct}%`} sub="claim / result shown" />
              )}
              {tassoClaimPct === null && funnel && (
                <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-card">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Claim rate</p>
                  <p className="text-4xl font-bold text-muted-foreground/40">—</p>
                  <p className="mt-1 text-xs text-muted-foreground">no funnel data</p>
                </div>
              )}
            </motion.div>

            {tassoClaimPct !== null && (
              <motion.div
                className={`flex items-center justify-between rounded-xl px-4 py-2 text-xs font-medium ${
                  tassoClaimColor === "green"
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : tassoClaimColor === "amber"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-destructive/10 text-destructive border border-destructive/20"
                }`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              >
                <span>
                  {tassoClaimColor === "green" ? "✅" : tassoClaimColor === "amber" ? "⚠️" : "❌"}&nbsp;
                  Claim rate: <strong>{tassoClaimPct}%</strong>
                  {tassoClaimColor === "green" ? " — great!" : tassoClaimColor === "amber" ? " — average" : " — needs improvement"}
                </span>
                <span className="text-muted-foreground">
                  {funnel?.claimed ?? 0} / {funnel?.resultShown ?? 0}
                </span>
              </motion.div>
            )}

            <ProductLeaderboard
              products={metrics.productStats}
              page={productPage}
              isFiltered={isFiltered}
              onPageChange={setProductPage}
              onProductClick={setSearch}
            />

            <SevenDayChart
              dayCounts={metrics.dayCounts}
              maxDay={metrics.maxDay}
              isFiltered={isFiltered}
            />

            {sessions.length > 0 && (
              <HourlyDistribution
                hourlyCounts={metrics.hourlyCounts}
                maxHourly={metrics.maxHourly}
                peakHour={metrics.peakHour}
              />
            )}

            {metrics.total > 0 && (
              <MatchHistogram
                brackets={metrics.matchBrackets}
                maxBracket={metrics.maxBracket}
                total={metrics.total}
              />
            )}

            {funnel && funnel.started > 0 && <FunnelChart funnel={funnel} />}

            <SessionsList
              allSessions={filteredSessions}
              searchedSessions={searchedSessions}
              search={search}
              page={page}
              filterStore={filterStore}
              isFiltered={isFiltered}
              codesGenerated={metrics.codesGenerated}
              codesUsed={metrics.codesUsed}
              onSearchChange={setSearch}
              onPageChange={setPage}
              onExport={() => setConfirmExport(true)}
            />

            <p className="pb-4 text-center text-xs text-muted-foreground">
              Suaipe · Analytics · Suaipe
            </p>
          </>
        )}
      </div>

      <AnimatePresence>
        {showMfaModal && (
          <MfaSetupModal
            onClose={() => setShowMfaModal(false)}
            onEnabled={() => setHasMfa(true)}
          />
        )}
      </AnimatePresence>

      <GdprExportConfirm
        open={confirmExport}
        sessionCount={filteredSessions.length}
        filterStore={filterStore}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onConfirm={handleExportConfirm}
        onCancel={() => setConfirmExport(false)}
      />
    </div>
  );
};
