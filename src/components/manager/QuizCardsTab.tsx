import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Globe, GripVertical, ImagePlus, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { resizeImagePng } from "@/lib/imageProcessing";
import { toast } from "sonner";
import { MAX_ACTIVE_QUIZ_CARDS, type QuizCard } from "@/data/quiz-cards";

// Recommended source size for card images — square, transparent PNG. We resize
// to this on upload, so larger uploads are fine; this is just the sweet spot.
const CARD_IMAGE_PX = 600;

const EMPTY_FORM = {
  emoji: "❓",
  image_url: "" as string,
  tag: "",
  text_it: "",
  text_en: "" as string,
  text_pt: "" as string,
  text_es: "" as string,
  text_fr: "" as string,
};

type CardForm = typeof EMPTY_FORM;

function tagToSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ── Card preview ──────────────────────────────────────────────────────────────
function CardPreview({ form, totalCards }: { form: CardForm; totalCards: number }) {
  const cardBg = "linear-gradient(158deg, hsl(228,52%,20%) 0%, hsl(228,68%,11%) 100%)";
  const text = form.text_it.trim() || "Question text…";
  const emoji = form.emoji.trim() || "❓";
  const tag = tagToSlug(form.tag) || "category";
  const step = String(1).padStart(2, "0");
  const total = String(Math.max(totalCards, 1)).padStart(2, "0");

  return (
    <div className="col-span-2 mt-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Card preview
      </p>
      <div
        className="relative mx-auto w-full max-w-[220px] rounded-[18px] overflow-hidden select-none"
        style={{ background: cardBg, border: "1px solid rgba(255,255,255,0.09)", aspectRatio: "3/5" }}
      >
        <div style={{ height: 3, background: "linear-gradient(90deg,hsl(217, 91%,55%),hsl(188, 86%,50%))" }} />
        <div className="flex flex-col h-full pb-4">
          <div className="flex items-center justify-between px-3 pt-2.5">
            <div className="flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full" style={{ background: "hsl(217, 91%,58%)", opacity: 0.85 }} />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: "hsla(188, 86%,72%,0.82)" }}>
                {tag}
              </span>
            </div>
            <span className="tabular-nums text-[8px] font-semibold" style={{ color: "hsla(188, 86%,72%,0.60)" }}>
              {step}<span style={{ opacity: 0.5 }}>&thinsp;/&thinsp;{total}</span>
            </span>
          </div>
          <div className="mx-3 mt-1.5" style={{ height: 1, background: "linear-gradient(to right,transparent,rgba(255,255,255,0.08),transparent)" }} />
          <div className="flex flex-1 items-center justify-center px-3">
            {form.image_url ? (
              <img src={form.image_url} alt="" className="object-contain" style={{ maxHeight: 80, maxWidth: "85%" }} />
            ) : (
              <span style={{ fontSize: 52, lineHeight: 1 }}>{emoji}</span>
            )}
          </div>
          <div className="mx-3" style={{ height: 1, background: "linear-gradient(to right,transparent,rgba(255,255,255,0.08),transparent)" }} />
          <div className="px-4 pt-2 text-center">
            <p className="text-[9px] font-bold leading-snug text-white" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
              {text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Audit helper ───────────────────────────────────────────────────────────────
async function logAudit(action: string, cardId: number | null, cardTag: string, newActive?: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("manager_audit_log").insert({
    user_id: user.id,
    user_email: user.email ?? null,
    product_id: `quiz_card:${cardId ?? cardTag}`,
    action,
    new_active: newActive ?? null,
  });
}

// ── Skeleton loader ─────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 animate-pulse">
          <div className="h-5 w-4 rounded bg-muted/50 shrink-0" />
          <div className="h-9 w-9 rounded-lg bg-muted/50 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted/50" />
            <div className="h-4 w-48 rounded bg-muted/40" />
          </div>
          <div className="flex gap-1 shrink-0">
            <div className="h-8 w-8 rounded-xl bg-muted/50" />
            <div className="h-8 w-8 rounded-xl bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Sortable card row ──────────────────────────────────────────────────────────
function SortableCard({
  card,
  selected,
  onSelect,
  onEdit,
  onToggle,
  onDelete,
  togglingId,
  deletingId,
}: {
  card: QuizCard;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onEdit: (card: QuizCard) => void;
  onToggle: (card: QuizCard) => void;
  onDelete: (card: QuizCard) => void;
  togglingId: number | null;
  deletingId: number | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={`flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 ${card.active ? "" : "opacity-50"}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Bulk select checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onSelect(card.id, e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Emoji — or the custom image when set */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center text-2xl select-none">
        {card.image_url
          ? <img src={card.image_url} alt="" className="max-h-9 max-w-full object-contain" />
          : card.emoji}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
            {card.tag}
          </span>
          <span className="text-[10px] text-muted-foreground/50">#{card.sort_order}</span>
          <div className="flex items-center gap-0.5 ml-1">
            {(["en", "pt", "es", "fr"] as const).map((lang) => {
              const key = `text_${lang}` as keyof QuizCard;
              const hasTranslation = !!(card[key]);
              return (
                <span
                  key={lang}
                  title={`${lang.toUpperCase()}: ${hasTranslation ? "✓" : "uses Italian"}`}
                  className={`text-[8px] font-bold rounded-sm px-0.5 ${hasTranslation ? "text-green-400 bg-green-400/10" : "text-muted-foreground/30 bg-muted/20"}`}
                >
                  {lang.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>
        <p className="mt-0.5 truncate text-sm text-foreground">{card.text_it}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(card)}
          className="rounded-xl p-2 text-muted-foreground hover:text-foreground active:scale-95"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onToggle(card)}
          disabled={togglingId === card.id}
          title={card.active ? "Hide card" : "Activate card"}
          className={`rounded-xl p-2 transition-colors active:scale-95 ${
            card.active ? "bg-green-500/10 text-green-400" : "bg-muted/40 text-muted-foreground"
          }`}
        >
          {card.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => onDelete(card)}
          disabled={deletingId === card.id}
          title="Delete card"
          className="rounded-xl p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function QuizCardsTab() {
  const [cards, setCards] = useState<QuizCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CardForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [showTranslateInfo, setShowTranslateInfo] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuizCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("quiz_cards")
      .select("id, emoji, image_url, tag, sort_order, active, text_it, text_en, text_pt, text_es, text_fr")
      .order("sort_order", { ascending: true });
    if (error) {
      setLoadError(error.message);
    } else {
      setCards((data ?? []) as QuizCard[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (card: QuizCard) => {
    setEditingId(card.id);
    setForm({
      emoji: card.emoji,
      image_url: card.image_url ?? "",
      tag: card.tag,
      text_it: card.text_it,
      text_en: card.text_en ?? "",
      text_pt: card.text_pt ?? "",
      text_es: card.text_es ?? "",
      text_fr: card.text_fr ?? "",
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

  // Upload a custom card image. Stored as a transparent PNG in the same
  // `product-images` bucket the catalog uses. A timestamped filename gives a
  // fresh URL on every upload, sidestepping CDN/browser caching of replacements.
  const uploadCardImage = async (rawFile: File) => {
    if (rawFile.size > 5 * 1024 * 1024) { setFormError("Image too large — maximum 5 MB."); return; }
    if (!["image/png", "image/webp", "image/jpeg"].includes(rawFile.type)) {
      setFormError("Unsupported format — use PNG (with transparency), WebP or JPEG.");
      return;
    }
    setUploadingImage(true);
    setFormError(null);
    const file = await resizeImagePng(rawFile, CARD_IMAGE_PX);
    const targetId = editingId ?? "new";
    const path = `quiz-cards/${targetId}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: "image/png" });
    if (error) { setFormError("Image upload error: " + error.message); setUploadingImage(false); return; }
    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
    setUploadingImage(false);
  };

  const saveCard = async () => {
    if (!form.emoji.trim()) { setFormError("Emoji is required."); return; }
    if (!form.tag.trim()) { setFormError("Category tag is required."); return; }
    if (!form.text_it.trim()) { setFormError("Italian text is required."); return; }

    const slug = tagToSlug(form.tag);
    if (!slug) { setFormError("Invalid tag — use only letters and hyphens."); return; }

    setSaving(true);
    setFormError(null);

    const payload = {
      emoji: form.emoji.trim(),
      image_url: form.image_url.trim() || null,
      tag: slug,
      text_it: form.text_it.trim(),
      text_en: form.text_en.trim() || null,
      text_pt: form.text_pt.trim() || null,
      text_es: form.text_es.trim() || null,
      text_fr: form.text_fr.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId !== null) {
      const { error } = await supabase.from("quiz_cards").update(payload).eq("id", editingId);
      if (error) { setFormError(error.message); setSaving(false); return; }
      logAudit("quiz_card_edit", editingId, slug);
      toast.success("Card updated.");
    } else {
      const maxOrder = cards.reduce((m, c) => Math.max(m, c.sort_order), 0);
      // New cards join the quiz only if there's room under the active cap;
      // otherwise they're created hidden so the manager can swap them in later.
      const atCap = cards.filter((c) => c.active).length >= MAX_ACTIVE_QUIZ_CARDS;
      const { data: inserted, error } = await supabase
        .from("quiz_cards")
        .insert({ ...payload, sort_order: maxOrder + 1, active: !atCap })
        .select("id")
        .single();
      if (error) { setFormError(error.message); setSaving(false); return; }
      logAudit("quiz_card_add", inserted?.id ?? null, slug, !atCap);
      toast.success(atCap
        ? `Card created — hidden, since ${MAX_ACTIVE_QUIZ_CARDS} cards are already active.`
        : "Card added to quiz.");
    }

    await fetchCards();
    cancelForm();
    setSaving(false);
  };

  const toggleActive = async (card: QuizCard) => {
    // Enforce the active cap: activating a 9th card is blocked; hiding is always allowed.
    if (!card.active && cards.filter((c) => c.active).length >= MAX_ACTIVE_QUIZ_CARDS) {
      toast.error(`Only ${MAX_ACTIVE_QUIZ_CARDS} cards can be active at once — deactivate one first.`);
      return;
    }
    setTogglingId(card.id);
    await supabase.from("quiz_cards").update({ active: !card.active, updated_at: new Date().toISOString() }).eq("id", card.id);
    logAudit("quiz_card_toggle", card.id, card.tag, !card.active);
    setCards((prev) => prev.map((c) => c.id === card.id ? { ...c, active: !c.active } : c));
    setTogglingId(null);
  };

  // ── Drag end: reorder + persist ─────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({
      ...c,
      sort_order: i + 1,
    }));
    setCards(reordered);

    // Persist new sort_order for affected cards
    await Promise.all(
      reordered.map((c) =>
        supabase.from("quiz_cards").update({ sort_order: c.sort_order, updated_at: new Date().toISOString() }).eq("id", c.id)
      )
    );
    logAudit("quiz_card_reorder", null, "batch");
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const handleSelect = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(cards.map((c) => c.id)) : new Set());
  };

  const bulkToggle = async (targetActive: boolean) => {
    if (targetActive) {
      const activeNow = cards.filter((c) => c.active).length;
      const newlyActivated = cards.filter((c) => selected.has(c.id) && !c.active).length;
      if (activeNow + newlyActivated > MAX_ACTIVE_QUIZ_CARDS) {
        toast.error(`That would exceed ${MAX_ACTIVE_QUIZ_CARDS} active cards — deactivate some first or select fewer.`);
        return;
      }
    }
    setBulkWorking(true);
    await Promise.all(
      [...selected].map((id) =>
        supabase.from("quiz_cards").update({ active: targetActive, updated_at: new Date().toISOString() }).eq("id", id)
      )
    );
    setCards((prev) => prev.map((c) => selected.has(c.id) ? { ...c, active: targetActive } : c));
    toast.success(`${selected.size} cards ${targetActive ? "activated" : "deactivated"}.`);
    setSelected(new Set());
    setBulkWorking(false);
  };

  const deleteCard = async (card: QuizCard) => {
    setDeletingId(card.id);
    const { error } = await supabase.from("quiz_cards").delete().eq("id", card.id);
    if (error) { toast.error("Delete failed: " + error.message); setDeletingId(null); return; }
    logAudit("quiz_card_delete", card.id, card.tag, false);
    setCards((prev) => prev.filter((c) => c.id !== card.id));
    setSelected((prev) => { const next = new Set(prev); next.delete(card.id); return next; });
    toast.success("Card deleted.");
    setDeletingId(null);
    setConfirmDelete(null);
  };

  const activeCount = cards.filter((c) => c.active).length;
  const allSelected = cards.length > 0 && selected.size === cards.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Quiz Cards</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading
              ? "Loading…"
              : `${activeCount} / ${MAX_ACTIVE_QUIZ_CARDS} active${cards.length > activeCount ? ` · ${cards.length} cards total` : ""}`}
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> New card
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
        💡 The quiz is a fixed {MAX_ACTIVE_QUIZ_CARDS}-swipe experience — up to {MAX_ACTIVE_QUIZ_CARDS} cards can be active at once. Create extra cards and swap them in by activating/deactivating. Drag to reorder; active cards appear in the quiz in the order shown.
      </div>

      {/* Add / Edit form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-primary/30 bg-card p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {editingId !== null ? "Edit card" : "New card"}
              </h3>
              <button onClick={cancelForm} className="text-muted-foreground active:scale-95">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">Center emoji *</label>
                <input
                  type="text"
                  value={form.emoji}
                  onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
                  placeholder="🏋️"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-2xl text-center focus:outline-none focus:ring-1 focus:ring-primary"
                  maxLength={4}
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Category tag * <span className="font-normal">(slug, e.g. "coffee")</span>
                </label>
                <input
                  type="text"
                  value={form.tag}
                  onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                  placeholder="e.g. coffee"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-1 text-[10px] text-muted-foreground/60">
                  The tag will appear automatically in the products form.
                </p>
              </div>

              {/* Optional custom image — replaces the emoji on the card */}
              <div className="col-span-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-medium text-muted-foreground">
                    Card image <span className="font-normal">(optional — replaces the emoji)</span>
                  </label>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                      className="flex items-center gap-1 text-[10px] text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="shrink-0 h-16 w-16 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
                    {form.image_url
                      ? <img src={form.image_url} alt="" className="max-h-full max-w-full object-contain" />
                      : <span className="text-2xl">{form.emoji.trim() || "❓"}</span>}
                  </div>
                  <div className="min-w-0">
                    <label className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary active:scale-95 cursor-pointer">
                      <ImagePlus className="h-3.5 w-3.5" />
                      {uploadingImage ? "Uploading…" : form.image_url ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        disabled={uploadingImage}
                        onChange={(e) => e.target.files?.[0] && uploadCardImage(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1.5 text-[10px] text-muted-foreground/60 leading-relaxed">
                      Square PNG with a transparent background, ~{CARD_IMAGE_PX}×{CARD_IMAGE_PX}px.
                      It replaces the emoji on the card; the emoji stays as a fallback.
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                  Question text — Italian *
                </label>
                <textarea
                  value={form.text_it}
                  onChange={(e) => setForm((f) => ({ ...f, text_it: e.target.value }))}
                  rows={2}
                  placeholder="E.g. Do you love quality coffee even when travelling?"
                  className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <CardPreview form={form} totalCards={cards.length || 1} />

              <div className="col-span-2 rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Translations (optional)
                  </span>
                  {/* Future feature — automatic translation via Edge Function.
                      Implementation roadmap:
                        1. Add Supabase secret DEEPL_API_KEY (or GOOGLE_TRANSLATE_API_KEY).
                        2. Create supabase/functions/translate-card/index.ts that takes
                           { text_it, target_langs: ["en","pt","es","fr"] } and returns
                           the translations.
                        3. Replace the disabled handler below with an async call that
                           posts to /functions/v1/translate-card and patches the form
                           state with the response. */}
                  <button
                    type="button"
                    disabled
                    title="Automatic translation — coming in a future release"
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground/40 cursor-not-allowed opacity-50"
                  >
                    <Globe className="h-3 w-3" />
                    🌐 Translate
                  </button>
                </div>

                <div
                  className="rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2 text-[10px] text-amber-400/70 leading-relaxed cursor-pointer"
                  onClick={() => setShowTranslateInfo((v) => !v)}
                >
                  <span className="font-semibold">ℹ️ Automatic translation</span>
                  {showTranslateInfo ? (
                    <p className="mt-1">
                      Automatic translation will be available in the future. You can enter translations manually.
                    </p>
                  ) : (
                    <span className="ml-1 opacity-60">— tap for details</span>
                  )}
                </div>

                {[
                  { key: "text_en" as const, label: "🇬🇧 English" },
                  { key: "text_pt" as const, label: "🇧🇷 Português" },
                  { key: "text_es" as const, label: "🇪🇸 Español" },
                  { key: "text_fr" as const, label: "🇫🇷 Français" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-medium text-muted-foreground/60 mb-1">{label}</label>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder="Leave empty → uses Italian text"
                      className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
                onClick={saveCard}
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground active:scale-95 disabled:opacity-60"
              >
                {saving ? "Saving…" : editingId !== null ? "Update" : "Add card"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card list */}
      {loading ? (
        <CardSkeleton />
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 py-12 text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm font-medium text-destructive">Error loading cards</p>
          <p className="text-xs text-muted-foreground mt-1">{loadError}</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <p className="text-2xl mb-2">🃏</p>
          <p className="text-sm font-medium text-foreground">No cards found</p>
          <p className="text-xs text-muted-foreground mt-1">Click "New card" to create one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Bulk action header */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              id="select-all-cards"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
            />
            <label htmlFor="select-all-cards" className="text-xs text-muted-foreground cursor-pointer select-none">
              Select all ({cards.length})
            </label>
            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-2 ml-2"
                >
                  <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
                  <button
                    onClick={() => bulkToggle(true)}
                    disabled={bulkWorking}
                    className="flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-1 text-[10px] font-semibold text-green-400 active:scale-95 disabled:opacity-50"
                  >
                    <Eye className="h-3 w-3" /> Activate
                  </button>
                  <button
                    onClick={() => bulkToggle(false)}
                    disabled={bulkWorking}
                    className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400 active:scale-95 disabled:opacity-50"
                  >
                    <EyeOff className="h-3 w-3" /> Deactivate
                  </button>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Draggable list */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {cards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  selected={selected.has(card.id)}
                  onSelect={handleSelect}
                  onEdit={openEditForm}
                  onToggle={toggleActive}
                  onDelete={setConfirmDelete}
                  togglingId={togglingId}
                  deletingId={deletingId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Confirm delete */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => deletingId === null && setConfirmDelete(null)}
            role="dialog" aria-modal="true" aria-label="Delete card"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Delete this card?</h3>
                  <p className="text-xs text-muted-foreground">This permanently removes it — it can't be undone.</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{confirmDelete.image_url ? "🖼️" : confirmDelete.emoji}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">{confirmDelete.tag}</span>
                  {confirmDelete.active && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">active</span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-foreground">{confirmDelete.text_it}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  disabled={deletingId !== null}
                  className="rounded-xl border border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground active:scale-95 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteCard(confirmDelete)}
                  disabled={deletingId !== null}
                  className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-white active:scale-95 disabled:opacity-60"
                >
                  {deletingId === confirmDelete.id ? "Deleting…" : "Delete card"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          onClick={fetchCards}
          className="flex items-center gap-1 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground active:scale-95"
        >
          <RotateCcw className="h-3 w-3" /> Refresh cards
        </button>
      </div>
    </div>
  );
}
