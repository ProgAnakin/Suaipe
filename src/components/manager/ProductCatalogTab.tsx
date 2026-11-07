import { useState, useEffect, useCallback } from "react";
import { Check, Eye, EyeOff, Pencil, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AVAILABLE_TAGS } from "@/data/products";
import { toast } from "sonner";

import { resizeImage } from "@/lib/imageProcessing";

/** Strip HTML tags from user-supplied text (XSS protection for custom product fields). */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

// Load distinct active tags from quiz_cards so new custom cards surface in the picker.
async function fetchActiveTags(): Promise<string[]> {
  const { data } = await supabase
    .from("quiz_cards")
    .select("tag")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (!data || data.length === 0) return [...AVAILABLE_TAGS];
  const fromDb = Array.from(new Set(data.map((r: { tag: string }) => r.tag)));
  // Merge with static fallback so existing tags are always present even if DB is slow
  const merged = Array.from(new Set([...fromDb, ...AVAILABLE_TAGS]));
  return merged.sort();
}

interface CustomProductRow {
  id: string;
  name: string;
  description: string;
  price: string;
  rating: number;
  image_url: string | null;
  video_url: string;
  tags: string[];
  faq: { q: string; a: string }[];
  status: "active" | "archived";
}

// Narrow the supabase `Json` value back to a `{q,a}[]` shape, dropping any
// malformed entry. Belt-and-braces — the manager UI only ever writes valid
// shape, but a manual SQL edit could break it.
function parseFaq(value: unknown): { q: string; a: string }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { q: string; a: string } =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as { q?: unknown }).q === "string" &&
      typeof (item as { a?: unknown }).a === "string",
  );
}

interface RawCustomProductRow extends Omit<CustomProductRow, "faq" | "status"> {
  faq: unknown;
  status: string;
}

function parseCustomProduct(row: RawCustomProductRow): CustomProductRow {
  return {
    ...row,
    faq: parseFaq(row.faq),
    status: row.status === "archived" ? "archived" : "active",
  };
}

interface GlobalStatusRow {
  product_id: string;
  hidden: boolean;
}

const EMPTY_FORM: Omit<CustomProductRow, "status"> = {
  id: "",
  name: "",
  description: "",
  price: "€",
  rating: 4.5,
  image_url: null,
  video_url: "#",
  tags: [],
  faq: [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ProductSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 animate-pulse">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/50" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-muted/50" />
            <div className="h-3 w-24 rounded bg-muted/40" />
          </div>
          <div className="flex gap-1">
            <div className="h-7 w-7 rounded-lg bg-muted/50" />
            <div className="h-7 w-7 rounded-lg bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductCatalogTab() {
  const [customProducts, setCustomProducts] = useState<CustomProductRow[]>([]);
  const [globalStatus, setGlobalStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [availableTags, setAvailableTags] = useState<string[]>([...AVAILABLE_TAGS]);
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CustomProductRow, "status">>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  // Multi-select bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [customRes, globalRes] = await Promise.all([
      supabase.from("custom_products").select("*").order("created_at", { ascending: false }),
      supabase.from("product_global_status").select("product_id, hidden"),
    ]);
    // `faq` arrives as Json from supabase; parse it into the strict shape.
    setCustomProducts(((customRes.data ?? []) as RawCustomProductRow[]).map(parseCustomProduct));
    const map: Record<string, boolean> = {};
    (globalRes.data ?? []).forEach((r: GlobalStatusRow) => { map[r.product_id] = r.hidden; });
    setGlobalStatus(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetchActiveTags().then(setAvailableTags);
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (p: CustomProductRow) => {
    setEditingId(p.id);
    setForm({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      rating: p.rating,
      image_url: p.image_url,
      video_url: p.video_url,
      tags: p.tags,
      faq: p.faq.length > 0
        ? [...p.faq, ...Array(3 - Math.min(p.faq.length, 3)).fill({ q: "", a: "" })].slice(0, 3)
        : [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }],
    });
    setFormError(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      // Auto-generate id only when creating a new product
      ...(editingId === null ? { id: slugify(name) } : {}),
    }));
  };

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const updateFaq = (index: number, field: "q" | "a", value: string) => {
    setForm((f) => {
      const faq = [...f.faq];
      faq[index] = { ...faq[index], [field]: value };
      return { ...f, faq };
    });
  };

  const uploadImage = async (rawFile: File) => {
    if (rawFile.size > 5 * 1024 * 1024) {
      setFormError("Image too large — maximum 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(rawFile.type)) {
      setFormError("Unsupported format — use JPEG, PNG or WebP.");
      return;
    }
    setUploadingImage(true);
    // #8 — auto-resize before upload
    try {
    const file = await resizeImage(rawFile);
    const targetId = form.id || `new-${Date.now()}`;
    const path = `custom/${targetId}.jpg`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      setFormError("Image upload error: " + error.message);
      setUploadingImage(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    } catch { setFormError("Image could not be processed or uploaded. Use a valid raster image up to 5 MB."); }
    finally { setUploadingImage(false); }
  };

  const saveProduct = async () => {
    const safeName = stripHtml(form.name);
    const safeDesc = stripHtml(form.description);
    if (!safeName) { setFormError("Name is required."); return; }
    if (safeName.length > 60) { setFormError("Name too long — maximum 60 characters."); return; }
    if (!form.id.trim()) { setFormError("Product ID is required."); return; }
    if (!safeDesc) { setFormError("Description is required."); return; }
    if (safeDesc.length > 300) { setFormError("Description too long — maximum 300 characters."); return; }
    // Apply sanitized values
    form.name = safeName;
    form.description = safeDesc;
    if (!form.price.trim() || form.price === "€") { setFormError("Price is required."); return; }
    if (!/^€?\d+([.,]\d{1,2})?$/.test(form.price.trim())) { setFormError("Invalid price format (e.g. €79.00 or 79.00)."); return; }
    if (form.tags.length === 0) { setFormError("Select at least one matching tag."); return; }

    setSaving(true);
    setFormError(null);

    const slugId = form.id.trim();

    // Slug collision check for new products — the whole catalog lives in
    // custom_products, so a single check covers every product.
    if (!editingId) {
      const { data: existing } = await supabase.from("custom_products").select("id").eq("id", slugId).maybeSingle();
      if (existing) {
        setFormError(`ID "${slugId}" already exists in the catalog. Choose a different ID.`);
        setSaving(false);
        return;
      }
    }

    const faqFiltered = form.faq.filter((f) => f.q.trim() || f.a.trim());
    const payload = {
      id: slugId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price.trim(),
      rating: form.rating,
      image_url: form.image_url,
      video_url: form.video_url.trim() || "#",
      tags: form.tags,
      faq: faqFiltered,
      status: "active" as const,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from("custom_products").update(payload).eq("id", editingId)
      : await supabase.from("custom_products").insert(payload);

    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    toast.success(editingId ? "Product updated." : "Product added to catalog.");
    await fetchData();
    cancelForm();
    setSaving(false);
  };

  const archiveProduct = async (id: string, archive: boolean) => {
    // Confirm on archive only — restore is a low-risk reversal.
    if (archive && !window.confirm(`Archive product "${id}"? It will disappear from the quiz in all stores.`)) return;
    setDeletingId(id);
    await supabase
      .from("custom_products")
      .update({ status: archive ? "archived" : "active", updated_at: new Date().toISOString() })
      .eq("id", id);
    toast.success(archive ? "Product archived." : "Product restored.");
    await fetchData();
    setDeletingId(null);
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm(`Permanently delete product "${id}"? This action cannot be undone.`)) return;
    setDeletingId(id);
    await supabase.from("custom_products").delete().eq("id", id);
    toast.success("Product permanently deleted.");
    await fetchData();
    setDeletingId(null);
  };

  const toggleGlobalHidden = async (productId: string) => {
    const currentlyHidden = globalStatus[productId] ?? false;
    const newHidden = !currentlyHidden;
    // Confirm only on hide — the global toggle affects every store, so a
    // misclick is operationally expensive. Showing back is harmless.
    if (newHidden && !window.confirm(`Hide "${productId}" from ALL stores? Customers will no longer see it in the quiz.`)) return;
    setTogglingId(productId);
    await supabase.from("product_global_status").upsert({
      product_id: productId,
      hidden: newHidden,
      updated_at: new Date().toISOString(),
    });
    setGlobalStatus((prev) => ({ ...prev, [productId]: newHidden }));
    setTogglingId(null);
  };

  const visibleCustom = customProducts.filter((p) => showArchived || p.status === "active");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    visibleCustom.length > 0 && visibleCustom.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleCustom.map((p) => p.id)));
  };

  // Bulk permanent delete — runs after the centered confirmation modal.
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    const { error } = await supabase.from("custom_products").delete().in("id", ids);
    setBulkDeleting(false);
    setShowBulkDeleteModal(false);
    if (error) {
      toast.error("Error deleting products.");
      return;
    }
    toast.success(`${ids.length} product${ids.length > 1 ? "s" : ""} permanently deleted.`);
    setSelectedIds(new Set());
    await fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Global Catalog Management</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add new products or hide existing ones across all stores.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit product" : "New product"}
            </h3>
            <button onClick={cancelForm} className="text-muted-foreground active:scale-95">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="E.g. AirPods Pro 3"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* ID */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                Product ID * <span className="font-normal">(auto-generated, editable)</span>
              </label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="e.g. airpods-pro-3"
                disabled={!!editingId}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Short product description…"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">Price *</label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="€79.00"
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                Rating ({form.rating.toFixed(1)})
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={0.1}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: parseFloat(e.target.value) }))}
                className="w-full mt-2"
              />
            </div>

            {/* Video URL */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">Video URL</label>
              <input
                type="text"
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                placeholder="https://youtube.com/..."
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Image upload */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-1">Product image</label>
              <div className="flex items-center gap-3">
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="h-12 w-12 rounded-xl object-cover border border-border"
                  />
                )}
                <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground active:scale-95 hover:border-primary/40">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingImage ? "Uploading…" : form.image_url ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
                  />
                </label>
                {!form.id && (
                  <span className="text-[10px] text-muted-foreground/60">Enter the name first to generate the ID</span>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="col-span-2">
              <label className="block text-[10px] font-medium text-muted-foreground mb-2">
                Matching tags * <span className="font-normal">(at least 1, ideally 3)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      form.tags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="col-span-2 space-y-3">
              <label className="block text-[10px] font-medium text-muted-foreground">FAQ (optional)</label>
              {form.faq.map((entry, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={entry.q}
                    onChange={(e) => updateFaq(i, "q", e.target.value)}
                    placeholder={`Question ${i + 1}`}
                    className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={entry.a}
                    onChange={(e) => updateFaq(i, "a", e.target.value)}
                    placeholder={`Answer ${i + 1}`}
                    className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          {formError && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={cancelForm}
              className="rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={saveProduct}
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add to catalog"}
            </button>
          </div>
        </div>
      )}

      {/* Product list — the whole catalog lives in custom_products */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Products ({customProducts.filter((p) => p.status === "active").length} active
            {customProducts.some((p) => p.status === "archived") && ` · ${customProducts.filter((p) => p.status === "archived").length} archived`})
          </h3>
          {customProducts.some((p) => p.status === "archived") && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-[10px] text-muted-foreground/70 hover:text-muted-foreground"
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          )}
        </div>

        {/* Select-all + bulk delete bar */}
        {!loading && visibleCustom.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                allVisibleSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}>
                {allVisibleSelected && <Check className="h-3 w-3" />}
              </span>
              Select all ({visibleCustom.length})
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete selected ({selectedIds.size})
              </button>
            )}
          </div>
        )}

        {loading ? (
          <ProductSkeleton />
        ) : visibleCustom.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/10 py-10 text-center">
            <p className="text-2xl mb-2">📦</p>
            <p className="text-sm font-medium text-foreground">No custom products</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Add" to create the first one.</p>
          </div>
        ) : (
          visibleCustom.map((p) => {
            const hidden = globalStatus[p.id] ?? false;
            const isArchived = p.status === "archived";
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 ${
                  selectedIds.has(p.id) ? "border-primary/60" : "border-border"
                } ${isArchived || hidden ? "opacity-50" : ""}`}
              >
                <button
                  onClick={() => toggleSelect(p.id)}
                  aria-label={selectedIds.has(p.id) ? "Deselect product" : "Select product"}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    selectedIds.has(p.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {selectedIds.has(p.id) && <Check className="h-3.5 w-3.5" />}
                </button>
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-9 w-9 shrink-0 rounded-lg object-contain bg-muted/30"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">
                    📷
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                    {isArchived && (
                      <span className="shrink-0 rounded-full bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        Archived
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.price} · {p.tags.join(", ")}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Global hide toggle */}
                  {!isArchived && (
                    <button
                      onClick={() => toggleGlobalHidden(p.id)}
                      disabled={togglingId === p.id}
                      title={hidden ? "Show" : "Hide"}
                      className={`rounded-xl p-2 transition-colors active:scale-95 ${
                        hidden ? "bg-muted/40 text-muted-foreground" : "bg-green-500/10 text-green-400"
                      }`}
                    >
                      {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  {/* Edit */}
                  {!isArchived && (
                    <button
                      onClick={() => openEditForm(p)}
                      className="rounded-xl p-2 text-muted-foreground hover:text-foreground active:scale-95"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {/* Archive / Restore */}
                  <button
                    onClick={() => archiveProduct(p.id, !isArchived)}
                    disabled={deletingId === p.id}
                    title={isArchived ? "Restore" : "Archive"}
                    className="rounded-xl p-2 text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    {isArchived ? <RotateCcw className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  {/* Delete (only archived) */}
                  {isArchived && (
                    <button
                      onClick={() => deleteProduct(p.id)}
                      disabled={deletingId === p.id}
                      title="Delete permanently"
                      className="rounded-xl p-2 text-destructive/70 hover:text-destructive active:scale-95"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          onClick={fetchData}
          className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
        >
          <RotateCcw className="h-3 w-3" /> Refresh catalog
        </button>
      </div>

      {/* Bulk-delete confirmation modal — centered */}
      {showBulkDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
          onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Delete products</p>
                <p className="text-xs text-foreground/70">{selectedIds.size} selected</p>
              </div>
            </div>
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
              <p className="font-semibold mb-1">⚠ Irreversible action</p>
              <p>
                {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} will be permanently
                removed from the catalog. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => !bulkDeleting && setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="flex-1 rounded-xl border border-border bg-muted/30 py-2.5 text-sm font-semibold text-foreground/70 hover:text-foreground active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex-1 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/20 active:scale-95 disabled:opacity-50"
              >
                {bulkDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
