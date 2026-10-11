import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Download, GraduationCap, Home, LogOut, MapPin, Power, PowerOff, RotateCcw, Upload, X } from "lucide-react";
import type { Store } from "@/data/stores";

interface ManagerHeaderProps {
  currentStore: Store | undefined;
  storeId: string;
  storeLocked: boolean;
  loading: boolean;
  catalogSize: number;
  activeCount: number;
  bulkSelectionSize: number;
  showCatalogActions: boolean;
  /** the heading of the tab that is open — it used to say "Catalog" on every tab */
  title?: string;
  onOpenStoreModal: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  onOpenSendModal: () => void;
  onClearBulkSelection: () => void;
  onRefresh: () => void;
  onDownloadCsvTemplate: () => void;
  onCsvUpload: (file: File) => void;
  onOpenAnalytics: () => void;
  onOpenConsulente: () => void;
  onLogout: () => void;
  onBackToQuiz: () => void;
}

/** Quiet segment inside the nav / toolbar pill groups. */
const segmentClass =
  "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-95";

export const ManagerHeader = ({
  currentStore,
  storeId,
  storeLocked,
  loading,
  catalogSize,
  activeCount,
  bulkSelectionSize,
  showCatalogActions,
  title = "📦 Catalog",
  onOpenStoreModal,
  onBulkActivate,
  onBulkDeactivate,
  onOpenSendModal,
  onClearBulkSelection,
  onRefresh,
  onDownloadCsvTemplate,
  onCsvUpload,
  onOpenAnalytics,
  onOpenConsulente,
  onLogout,
  onBackToQuiz,
}: ManagerHeaderProps) => (
  <motion.div
    className="space-y-3"
    initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
  >
    {/* ── Row 1 · identity + navigation ─────────────────────────────────── */}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <button
          onClick={() => !storeLocked && onOpenStoreModal()}
          className={`mt-0.5 flex items-center gap-1 text-xs ${
            storeLocked ? "text-muted-foreground cursor-default" : "text-primary hover:underline"
          }`}
        >
          <MapPin className="h-3 w-3" />
          {currentStore?.shortName ?? storeId}
          {storeLocked && <span className="ml-1 opacity-50">(locked)</span>}
        </button>
        {showCatalogActions && (
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading…" : `${activeCount} of ${catalogSize} products active in the quiz`}
          </p>
        )}
      </div>

      {/* Navigation cluster — one pill group, one accent (Analytics). */}
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        <button
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 rounded-xl gradient-primary px-3 py-2 text-xs font-semibold text-white shadow-md shadow-primary/30 active:scale-95"
        >
          <BarChart2 className="h-3.5 w-3.5" /> Analytics
        </button>
        <button onClick={onOpenConsulente} className={segmentClass}>
          <GraduationCap className="h-3.5 w-3.5" /> Consulente
        </button>
        <button onClick={onBackToQuiz} className={segmentClass}>
          <Home className="h-3.5 w-3.5" /> Quiz
        </button>
        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </div>

    {/* ── Row 2 · catalog toolbar (Catalog tab only) ────────────────────── */}
    {showCatalogActions && (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button
          onClick={onDownloadCsvTemplate}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95"
        >
          <Download className="h-3.5 w-3.5" /> CSV Template
        </button>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground active:scale-95">
          <Upload className="h-3.5 w-3.5" /> Upload Prices
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && onCsvUpload(e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>
    )}

    {/* ── Bulk selection · contextual action bar ────────────────────────── */}
    <AnimatePresence>
      {bulkSelectionSize > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2"
        >
          <span className="px-1 text-xs font-semibold text-primary">
            {bulkSelectionSize} selected
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={onBulkActivate}
              className="flex items-center gap-1.5 rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 active:scale-95"
            >
              <Power className="h-3.5 w-3.5" /> Activate
            </button>
            <button
              onClick={onBulkDeactivate}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 active:scale-95"
            >
              <PowerOff className="h-3.5 w-3.5" /> Deactivate
            </button>
            <button
              onClick={onOpenSendModal}
              className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-400 active:scale-95"
            >
              <MapPin className="h-3.5 w-3.5" /> Send to store
            </button>
            <button
              onClick={onClearBulkSelection}
              aria-label="Clear selection"
              className="flex items-center rounded-xl px-2.5 py-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);
