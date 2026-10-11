import { downloadTextFile, parseCsv, toCsv } from "@/lib/csv";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStoredStoreId, setStoredStoreId, getStoreById } from "@/data/stores";
import { useIdleLogout } from "@/hooks/useIdleLogout";
import { StoreSelectorModal } from "./StoreSelectorModal";
import { FaqModal, FaqData, EMPTY_FAQ } from "./FaqModal";
import { SessionsTab } from "./SessionsTab";
import { ProductCatalogTab } from "./ProductCatalogTab";
import { QuizCardsTab } from "./QuizCardsTab";
import { EmailTemplateTab } from "./EmailTemplateTab";
import { RolesTab } from "./RolesTab";
import { GuideEditorTab } from "./GuideEditorTab";
import { BulkConfirmBanner, type BulkConfirmIntent } from "./BulkConfirmBanner";
import { SendToStoreModal } from "./SendToStoreModal";
import { CsvPreviewModal, type CsvPriceUpdate } from "./CsvPreviewModal";
import { UndoSnackbar } from "./UndoSnackbar";
import { type DiscountOption } from "./managerDashboardUtils";
import { AuditLogTab } from "./AuditLogTab";
import { PrimaryTabs, ManagementSubTabs, type ActiveTab, type GestioneTab } from "./TabSwitcher";
import { ProductRow } from "./ProductRow";
import { ManagerHeader } from "./ManagerHeader";
import { useAuditLog } from "./useAuditLog";
import { useUndoToggle } from "./useUndoToggle";
import { useProductCatalog } from "./useProductCatalog";
import { useManagerKeybindings } from "./useManagerKeybindings";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabErrorFallback } from "./TabErrorFallback";

interface ManagerDashboardProps {
  onLogout: () => void;
}

export const ManagerDashboard = ({ onLogout }: ManagerDashboardProps) => {
  const navigate = useNavigate();
  // ── UI state (drafts, modals, filters) ────────────────────────────
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [draftVideo, setDraftVideo] = useState("");
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState("");
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [storeId, setStoreIdState] = useState<string>(
    () => getStoredStoreId() ?? "rio-de-janeiro"
  );
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<BulkConfirmIntent | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPriceUpdate[]>([]);
  const [userRole, setUserRole] = useState<{ role: string; store_id: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalogo");
  const [gestioneTab, setGestioneTab] = useState<GestioneTab>("catalogo");

  // ── Catalog data + per-store overrides + save handlers ────────────
  const catalog = useProductCatalog(storeId);
  const {
    settings, priceOverrides, imageOverrides, videoOverrides,
    discountOverrides, faqOverrides, updatedAtMap, customProducts,
    loading, savingId, saveError, uploadingImageId, priceError, videoError,
    setPriceError, setVideoError,
  } = catalog;

  const currentStore = getStoreById(storeId);

  useIdleLogout(onLogout);

  // Fetch the logged-in user's store role; lock store selector for consulente.
  useEffect(() => {
    supabase.rpc("get_my_store_role").then(({ data }) => {
      if (!data || data.length === 0) return;
      const r = data[0] as { role: string; store_id: string | null };
      setUserRole(r);
      if (r.role === "consulente_responsabile" && r.store_id) {
        setStoreIdState(r.store_id);
        setStoredStoreId(r.store_id);
      }
    });
  }, []);

  const catalogProducts = customProducts;
  const customProductIds = new Set(customProducts.map((p) => p.id));
  const allTags = Array.from(new Set(catalogProducts.flatMap((p) => p.tags))).sort();

  const auditLog = useAuditLog(activeTab === "storico");

  const undo = useUndoToggle(async (entry) => {
    await catalog.saveProductActive(entry.productId, entry.restoredValue);
  });

  const toggleProduct = async (productId: string) => {
    const current = settings[productId] ?? true;
    const ok = await catalog.saveProductActive(productId, !current);
    if (!ok) return;
    undo.arm({ productId, restoredValue: current });
  };

  /** Closes the inline editor after a successful price save. */
  const savePriceOverride = async (productId: string, price: string) => {
    const ok = await catalog.savePriceOverride(productId, price);
    if (ok) setEditingPriceId(null);
  };

  /** Closes the inline editor after a successful video save. */
  const saveVideoUrl = async (productId: string, url: string) => {
    const ok = await catalog.saveVideoUrl(productId, url);
    if (ok) setEditingVideoId(null);
  };

  const saveFaq = async (productId: string, faq: FaqData) => {
    await catalog.saveFaq(productId, faq);
    setEditingFaqId(null);
  };

  const requestBulkToggle = (enable: boolean) => {
    setBulkConfirm({ enable, count: bulkSelection.size });
  };

  const handleBulkToggle = async (enable: boolean) => {
    for (const productId of bulkSelection) {
      await catalog.saveProductActive(productId, enable);
    }
    setBulkSelection(new Set());
    setBulkConfirm(null);
  };

  const sendToStore = async (targetStoreId: string) => {
    setSending(true);
    const ok = await catalog.sendToStore([...bulkSelection], targetStoreId);
    setSending(false);
    setShowSendModal(false);
    if (ok) setBulkSelection(new Set());
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const known = new Set(catalogProducts.map((p) => p.id));
    const parsed: CsvPriceUpdate[] = [];
    let ignored = 0;
    for (const [productId, price] of parseCsv(text)) {
      // the header row, blank cells and ids that are not in the catalogue are skipped — saving a
      // price override for "product_id" would only leave a junk row behind
      if (!productId || !price || !known.has(productId)) { if (productId && productId !== "product_id") ignored++; continue; }
      parsed.push({ productId, newPrice: price });
    }
    if (ignored > 0) toast.warning(`${ignored} line${ignored === 1 ? "" : "s"} ignored: unknown product id or no price.`);
    if (parsed.length === 0) { toast.error("No valid prices found in the file."); return; }
    setCsvPreview(parsed);
    setShowCsvModal(true);
  };

  const applyPriceUpload = async () => {
    for (const { productId, newPrice } of csvPreview) {
      await catalog.savePriceOverride(productId, newPrice);
    }
    toast.success(`${csvPreview.length} prices updated from CSV.`);
    setCsvPreview([]);
    setShowCsvModal(false);
  };

  const downloadCsvTemplate = () => {
    // a price such as "€64,00" contains a comma: every cell is quoted (and defused) by toCsv, and
    // parseCsv reads them back — the old template split "€64,00" in two and re-imported "€64"
    const rows = [["product_id", "price"], ...catalogProducts.map((p) => [p.id, p.price])];
    downloadTextFile("product-prices.csv", toCsv(rows));
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  useManagerKeybindings({
    onRefresh: () => { catalog.refetch(); toast.info("Catalog refreshed."); },
    onEscape: () => {
      if (bulkSelection.size > 0) setBulkSelection(new Set());
      if (bulkConfirm) setBulkConfirm(null);
      if (showCsvModal) setShowCsvModal(false);
      if (showStoreModal) setShowStoreModal(false);
      if (editingFaqId) setEditingFaqId(null);
    },
  });

  const sortedProducts = [...catalogProducts].sort((a, b) => {
    const aOn = settings[a.id] !== false;
    const bOn = settings[b.id] !== false;
    if (aOn === bOn) return 0;
    return aOn ? -1 : 1;
  });

  const filteredProducts = sortedProducts.filter((p) => {
    const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
    const matchTag = filterTag === null || p.tags.includes(filterTag);
    return matchSearch && matchTag;
  });

  const activeCount = catalogProducts.filter((p) => settings[p.id] !== false).length;

  // Select-all: true if all filtered products are in bulkSelection
  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => bulkSelection.has(p.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSet = new Set(bulkSelection);
      filteredProducts.forEach((p) => newSet.add(p.id));
      setBulkSelection(newSet);
    } else {
      const newSet = new Set(bulkSelection);
      filteredProducts.forEach((p) => newSet.delete(p.id));
      setBulkSelection(newSet);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">

        <ManagerHeader
          currentStore={currentStore}
          storeId={storeId}
          storeLocked={userRole?.role === "consulente_responsabile"}
          loading={loading}
          catalogSize={catalogProducts.length}
          activeCount={activeCount}
          bulkSelectionSize={bulkSelection.size}
          showCatalogActions={activeTab === "catalogo"}
          title={{ catalogo: "📦 Catalog", sessioni: "📬 Sessions & Codes", storico: "🕘 History", gestione: "🗂️ Management" }[activeTab]}
          onOpenStoreModal={() => setShowStoreModal(true)}
          onBulkActivate={() => requestBulkToggle(true)}
          onBulkDeactivate={() => requestBulkToggle(false)}
          onOpenSendModal={() => setShowSendModal(true)}
          onClearBulkSelection={() => setBulkSelection(new Set())}
          onRefresh={catalog.refetch}
          onDownloadCsvTemplate={downloadCsvTemplate}
          onCsvUpload={handleCsvUpload}
          onOpenAnalytics={() => navigate("/stats")}
          onOpenConsulente={() => navigate("/consulente")}
          onLogout={handleLogout}
          onBackToQuiz={() => { supabase.auth.signOut(); navigate("/"); }}
        />

        {/* Error banner */}
        <AnimatePresence>
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {saveError}
            </motion.div>
          )}
        </AnimatePresence>

        <BulkConfirmBanner
          intent={bulkConfirm}
          onConfirm={handleBulkToggle}
          onCancel={() => setBulkConfirm(null)}
        />

        <PrimaryTabs
          active={activeTab}
          showManagement={userRole?.role !== "consulente_responsabile"}
          onChange={setActiveTab}
        />

        {activeTab === "gestione" && (
          <div className="space-y-4">
            <ManagementSubTabs active={gestioneTab} onChange={setGestioneTab} />
            <ErrorBoundary
              resetKeys={[gestioneTab]}
              fallback={(reset) => <TabErrorFallback section="management" onRetry={reset} />}
            >
              {gestioneTab === "catalogo" && <ProductCatalogTab />}
              {gestioneTab === "carte"    && <QuizCardsTab />}
              {gestioneTab === "email"    && <EmailTemplateTab />}
              {gestioneTab === "ruoli"    && <RolesTab />}
              {gestioneTab === "guida"    && <GuideEditorTab />}
            </ErrorBoundary>
          </div>
        )}

        {/* Sessions tab */}
        {activeTab === "sessioni" && (
          <ErrorBoundary
            resetKeys={[storeId]}
            fallback={(reset) => <TabErrorFallback section="Sessions" onRetry={reset} />}
          >
            <SessionsTab
              storeId={storeId}
              isGlobal={userRole?.role !== "consulente_responsabile"}
            />
          </ErrorBoundary>
        )}

        {activeTab === "storico" && (
          <ErrorBoundary
            fallback={(reset) => <TabErrorFallback section="Audit Log" onRetry={reset} />}
          >
            <AuditLogTab
              loading={auditLog.loading}
              error={auditLog.error}
              entries={auditLog.entries}
              catalogProducts={catalogProducts}
              onRefresh={auditLog.refetch}
            />
          </ErrorBoundary>
        )}

        {/* Catalogo-only sections below */}
        {activeTab === "catalogo" && (<>

        {/* Info banner */}
        <motion.div
          className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        >
          💡 Products marked <strong className="text-foreground">Paused</strong> are excluded from
          quiz matches — useful for out-of-stock items or ended partnerships. Changes apply
          immediately: the next quiz session will use the updated list.
        </motion.div>

        {/* Search + tag filter */}
        {!loading && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text" placeholder="Search products…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-9 pr-9 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setFilterTag(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filterTag === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                All
              </button>
              {allTags.map((tag) => (
                <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    filterTag === tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 rounded bg-muted/50 mt-1.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-12 rounded bg-muted/50" />
                    <div className="h-5 w-48 rounded bg-muted/50" />
                    <div className="h-3 w-24 rounded bg-muted/40" />
                  </div>
                  <div className="h-8 w-20 rounded-xl bg-muted/50 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No products found for "{search || filterTag}".
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select-all header */}
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="select-all-checkbox"
                checked={allFilteredSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 cursor-pointer"
              />
              <label htmlFor="select-all-checkbox" className="cursor-pointer text-xs text-muted-foreground select-none">
                Select all ({filteredProducts.length})
              </label>
            </div>

            {filteredProducts.map((product, i) => {
              const faqData = faqOverrides[product.id];
              const ownFaqHasContent = (product.faq ?? []).some((f) => f.q?.trim() && f.a?.trim());
              const faqComplete = !!(faqData?.q1 && faqData?.a1) || ownFaqHasContent;
              const ownImage = product.image && product.image !== "/products/placeholder.png"
                ? product.image : "";
              const ownVideo = product.videoUrl && product.videoUrl !== "#" ? product.videoUrl : "";
              return (
                <ProductRow
                  key={product.id}
                  product={product}
                  index={i}
                  isActive={settings[product.id] !== false}
                  isSaving={savingId === product.id}
                  isCustom={customProductIds.has(product.id)}
                  updatedAt={updatedAtMap[product.id]}
                  bulkSelected={bulkSelection.has(product.id)}
                  onBulkSelectToggle={(selected) => {
                    const next = new Set(bulkSelection);
                    if (selected) next.add(product.id);
                    else next.delete(product.id);
                    setBulkSelection(next);
                  }}
                  onToggle={() => toggleProduct(product.id)}
                  priceOverride={priceOverrides[product.id]}
                  price={{
                    active: editingPriceId === product.id,
                    draft: draftPrice,
                    error: priceError,
                    onStart: (current) => {
                      setEditingPriceId(product.id);
                      setDraftPrice(current);
                      setPriceError(null);
                    },
                    onChange: (value) => { setDraftPrice(value); setPriceError(null); },
                    onSubmit: (value) => savePriceOverride(product.id, value),
                    onCancel: () => { setEditingPriceId(null); setPriceError(null); },
                  }}
                  discount={(discountOverrides[product.id] ?? 5) as DiscountOption}
                  onDiscountChange={(value) => catalog.saveDiscount(product.id, value)}
                  image={{
                    hasOverride: !!imageOverrides[product.id],
                    shown: imageOverrides[product.id] || ownImage,
                    uploading: uploadingImageId === product.id,
                    anyUploading: uploadingImageId !== null,
                    onUpload: (file) => catalog.uploadProductImage(product.id, file),
                    onRemove: () => catalog.removeProductImage(product.id),
                  }}
                  video={{
                    active: editingVideoId === product.id,
                    draft: draftVideo,
                    error: videoError,
                    hasVideo: !!videoOverrides[product.id] || !!ownVideo,
                    onStart: () => {
                      setEditingVideoId(product.id);
                      setDraftVideo(videoOverrides[product.id] ?? ownVideo);
                      setVideoError(null);
                    },
                    onChange: (value) => { setDraftVideo(value); setVideoError(null); },
                    onSubmit: (value) => saveVideoUrl(product.id, value),
                    onCancel: () => { setEditingVideoId(null); setVideoError(null); },
                  }}
                  faq={{
                    complete: faqComplete,
                    partial: !faqComplete && !!(faqData?.q1),
                    onOpen: () => setEditingFaqId(product.id),
                  }}
                />
              );
            })}
          </div>
        )}

        <p className="pb-4 text-center text-xs text-muted-foreground">
          Suaipe · Catalog Management · Suaipe
        </p>

        </>)} {/* end catalogo tab */}
      </div>

      {/* FAQ Modal */}
      <AnimatePresence>
        {editingFaqId && (() => {
          const prod = catalogProducts.find((p) => p.id === editingFaqId);
          if (!prod) return null;
          return (
            <FaqModal
              key={editingFaqId}
              productName={prod.name}
              initial={faqOverrides[editingFaqId] ?? EMPTY_FAQ}
              onSave={(data) => saveFaq(editingFaqId, data)}
              onClose={() => setEditingFaqId(null)}
            />
          );
        })()}
      </AnimatePresence>

      {/* Store selector modal */}
      <AnimatePresence>
        {showStoreModal && (
          <StoreSelectorModal
            currentId={storeId}
            onSelect={(id) => {
              setStoredStoreId(id);
              setStoreIdState(id);
              setShowStoreModal(false);
            }}
            onClose={() => setShowStoreModal(false)}
          />
        )}
      </AnimatePresence>

      <SendToStoreModal
        open={showSendModal}
        sourceStoreId={storeId}
        selectionCount={bulkSelection.size}
        sending={sending}
        onSend={sendToStore}
        onClose={() => setShowSendModal(false)}
      />

      <CsvPreviewModal
        open={showCsvModal}
        preview={csvPreview}
        catalogProducts={catalogProducts}
        onApply={applyPriceUpload}
        onClose={() => setShowCsvModal(false)}
      />

      <UndoSnackbar
        visible={!!undo.entry}
        countdown={undo.countdown}
        onUndo={undo.trigger}
      />
    </div>
  );
};
