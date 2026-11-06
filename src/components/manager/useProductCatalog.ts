import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type Product } from "@/data/products";
import { getStoreById } from "@/data/stores";
import { resizeImage } from "@/lib/imageProcessing";
import { isValidPrice, isValidVideoUrl } from "./managerDashboardUtils";
import type {
  SettingsMap, PriceMap, ImageMap, VideoMap, DiscountMap, FaqMap, UpdatedAtMap,
  DiscountOption,
} from "./managerDashboardUtils";
import type { FaqData } from "./FaqModal";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Owns the per-store catalog state for the manager dashboard: which
 * products are active, the per-store overrides (price / image / video /
 * discount / FAQ), the custom products merged in from the global
 * catalog, plus every atomic save handler that touches product_settings.
 *
 * UI-only state (edit drafts, modal visibility, bulk selection, search
 * filters) stays in the dashboard component on purpose — the hook
 * exposes a flat API of pure data + actions, not "open this modal".
 */
export const useProductCatalog = (storeId: string) => {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [priceOverrides, setPriceOverrides] = useState<PriceMap>({});
  const [imageOverrides, setImageOverrides] = useState<ImageMap>({});
  const [videoOverrides, setVideoOverrides] = useState<VideoMap>({});
  const [discountOverrides, setDiscountOverrides] = useState<DiscountMap>({});
  const [faqOverrides, setFaqOverrides] = useState<FaqMap>({});
  const [updatedAtMap, setUpdatedAtMap] = useState<UpdatedAtMap>({});
  const [customProducts, setCustomProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("product_settings")
      .select("product_id, active, price_override, image_url, video_url, discount_percent, faq_q1, faq_a1, faq_q2, faq_a2, faq_q3, faq_a3, updated_at")
      .eq("store_id", storeId);
    if (data) {
      const map: SettingsMap = {};
      const prices: PriceMap = {};
      const images: ImageMap = {};
      const videos: VideoMap = {};
      const discounts: DiscountMap = {};
      const faqs: FaqMap = {};
      const updatedAt: UpdatedAtMap = {};
      data.forEach((row) => {
        map[row.product_id] = row.active;
        if (row.price_override) prices[row.product_id] = row.price_override;
        if (row.image_url) images[row.product_id] = row.image_url;
        if (row.video_url) videos[row.product_id] = row.video_url;
        if (row.discount_percent) discounts[row.product_id] = row.discount_percent;
        const { faq_q1, faq_a1, faq_q2, faq_a2, faq_q3, faq_a3, updated_at: ua } = row;
        if (faq_q1 || faq_q2 || faq_q3) {
          faqs[row.product_id] = {
            q1: faq_q1 ?? "", a1: faq_a1 ?? "",
            q2: faq_q2 ?? "", a2: faq_a2 ?? "",
            q3: faq_q3 ?? "", a3: faq_a3 ?? "",
          };
        }
        if (ua) updatedAt[row.product_id] = ua;
      });
      setSettings(map);
      setPriceOverrides(prices);
      setImageOverrides(images);
      setVideoOverrides(videos);
      setDiscountOverrides(discounts);
      setFaqOverrides(faqs);
      setUpdatedAtMap(updatedAt);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const fetchCustomProducts = useCallback(async () => {
    const { data } = await supabase
      .from("custom_products")
      .select("id, name, description, price, rating, image_url, video_url, tags, faq")
      .eq("status", "active");
    if (!data) return;
    setCustomProducts(
      data.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        price: r.price,
        rating: r.rating,
        image: r.image_url ?? "/products/placeholder.png",
        videoUrl: r.video_url ?? "#",
        tags: r.tags ?? [],
        faq: (r.faq as { q: string; a: string }[]) ?? [],
      })),
    );
  }, []);

  useEffect(() => { fetchCustomProducts(); }, [fetchCustomProducts]);

  /**
   * Core upsert — optimistic local update + audit-log write. Returns false
   * on failure so the caller can decide whether to arm an undo window.
   */
  const saveProductActive = useCallback(async (productId: string, targetActive: boolean) => {
    const current = settings[productId] ?? true;
    setSettings((prev) => ({ ...prev, [productId]: targetActive }));
    setSavingId(productId);
    setSaveError(null);

    const { error } = await supabase
      .from("product_settings")
      .upsert({ product_id: productId, store_id: storeId, active: targetActive, updated_at: new Date().toISOString() });

    if (error) {
      setSavingId(null);
      setSettings((prev) => ({ ...prev, [productId]: current }));
      setSaveError("Error saving. Check the connection and try again.");
      toast.error("Error saving. Check the connection.");
      return false;
    }

    // The database trigger records the committed change atomically.

    setSavingId(null);
    return true;
  }, [settings, storeId]);

  const savePriceOverride = useCallback(async (productId: string, price: string) => {
    const trimmed = price.trim();
    if (trimmed !== "" && !isValidPrice(trimmed)) {
      setPriceError("Invalid format (e.g. €49.00)");
      return false;
    }
    setPriceError(null);
    const { error } = await supabase
      .from("product_settings")
      .upsert({
        product_id: productId,
        store_id: storeId,
        price_override: trimmed || null,
        updated_at: new Date().toISOString(),
      });
    if (!error) {
      setPriceOverrides((prev) => {
        if (!trimmed) { const n = { ...prev }; delete n[productId]; return n; }
        return { ...prev, [productId]: trimmed };
      });
    }
    return !error;
  }, [storeId]);

  const saveVideoUrl = useCallback(async (productId: string, url: string) => {
    const trimmed = url.trim();
    if (trimmed !== "" && !isValidVideoUrl(trimmed)) {
      setVideoError("Invalid URL — use YouTube or Vimeo");
      return false;
    }
    setVideoError(null);
    await supabase.from("product_settings").upsert({
      product_id: productId,
      store_id: storeId,
      video_url: trimmed || null,
      updated_at: new Date().toISOString(),
    });
    setVideoOverrides((prev) => {
      if (!trimmed) { const n = { ...prev }; delete n[productId]; return n; }
      return { ...prev, [productId]: trimmed };
    });
    return true;
  }, [storeId]);

  const saveDiscount = useCallback(async (productId: string, pct: DiscountOption) => {
    await supabase.from("product_settings").upsert({
      product_id: productId,
      store_id: storeId,
      discount_percent: pct,
      updated_at: new Date().toISOString(),
    });
    setDiscountOverrides((prev) => ({ ...prev, [productId]: pct }));
  }, [storeId]);

  const saveFaq = useCallback(async (productId: string, faq: FaqData) => {
    await supabase.from("product_settings").upsert({
      product_id: productId,
      store_id: storeId,
      faq_q1: faq.q1 || null, faq_a1: faq.a1 || null,
      faq_q2: faq.q2 || null, faq_a2: faq.a2 || null,
      faq_q3: faq.q3 || null, faq_a3: faq.a3 || null,
      updated_at: new Date().toISOString(),
    });
    setFaqOverrides((prev) => ({ ...prev, [productId]: faq }));
  }, [storeId]);

  const uploadProductImage = useCallback(async (productId: string, rawFile: File) => {
    if (rawFile.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large — maximum 5 MB.");
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(rawFile.type)) {
      toast.error("Unsupported format — use JPEG, PNG, WebP or GIF.");
      return;
    }
    setUploadingImageId(productId);
    const file = await resizeImage(rawFile);
    const path = `${storeId}/${productId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, contentType: "image/jpeg" });

    if (uploadError) {
      toast.error("Image upload error: " + uploadError.message);
      setUploadingImageId(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    await supabase.from("product_settings").upsert({
      product_id: productId,
      store_id: storeId,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    });

    setImageOverrides((prev) => ({ ...prev, [productId]: imageUrl }));
    toast.success("Image uploaded.");
    setUploadingImageId(null);
  }, [storeId]);

  const removeProductImage = useCallback(async (productId: string) => {
    await supabase.from("product_settings").upsert({
      product_id: productId,
      store_id: storeId,
      image_url: null,
      updated_at: new Date().toISOString(),
    });
    setImageOverrides((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, [storeId]);

  /**
   * Copies a list of products into another store's catalog, carrying this
   * store's per-store overrides. Used by the "Send to store" bulk action.
   */
  const sendToStore = useCallback(async (productIds: string[], targetStoreId: string) => {
    if (productIds.length === 0) return false;
    const { data: srcRows } = await supabase
      .from("product_settings")
      .select("product_id, price_override, image_url, video_url, discount_percent, faq_q1, faq_a1, faq_q2, faq_a2, faq_q3, faq_a3")
      .eq("store_id", storeId)
      .in("product_id", productIds);
    const byId = new Map((srcRows ?? []).map((r) => [r.product_id, r]));
    const payload = productIds.map((pid) => {
      const src = byId.get(pid);
      return {
        product_id: pid,
        store_id: targetStoreId,
        active: true,
        price_override:   src?.price_override   ?? null,
        image_url:        src?.image_url        ?? null,
        video_url:        src?.video_url        ?? null,
        discount_percent: src?.discount_percent ?? 5,
        faq_q1: src?.faq_q1 ?? null, faq_a1: src?.faq_a1 ?? null,
        faq_q2: src?.faq_q2 ?? null, faq_a2: src?.faq_a2 ?? null,
        faq_q3: src?.faq_q3 ?? null, faq_a3: src?.faq_a3 ?? null,
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase
      .from("product_settings")
      .upsert(payload, { onConflict: "product_id,store_id" });
    if (error) {
      toast.error("Error sending products to the store.");
      return false;
    }
    const target = getStoreById(targetStoreId);
    toast.success(`${productIds.length} product${productIds.length > 1 ? "s" : ""} sent to ${target?.shortName ?? targetStoreId}.`);
    return true;
  }, [storeId]);

  return {
    // Data
    settings,
    priceOverrides,
    imageOverrides,
    videoOverrides,
    discountOverrides,
    faqOverrides,
    updatedAtMap,
    customProducts,
    // Status
    loading,
    savingId,
    saveError,
    uploadingImageId,
    priceError,
    videoError,
    setPriceError,
    setVideoError,
    // Actions
    refetch: fetchSettings,
    saveProductActive,
    savePriceOverride,
    saveVideoUrl,
    saveDiscount,
    saveFaq,
    uploadProductImage,
    removeProductImage,
    sendToStore,
  };
};
