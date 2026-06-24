import { useState, useEffect } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Transition } from "framer-motion";
import WelcomeScreen, { type UserInfo } from "@/components/WelcomeScreen";
import QuizScreen from "@/components/QuizScreen";
import MatchResult from "@/components/MatchResult";
import SuccessScreen from "@/components/SuccessScreen";
import AttractScreen from "@/components/AttractScreen";
import { KioskLockScreen } from "@/components/KioskLockScreen";
import { getMatchedProduct, type Product } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
import { useInactivityReset } from "@/hooks/useInactivityReset";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useBgMusic } from "@/hooks/useBgMusic";
import { useKioskMode } from "@/hooks/useKioskMode";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useLang } from "@/i18n/LanguageContext";
import { getStoredStoreId } from "@/data/stores";
import { RESULT_INACTIVITY_TIMEOUT_MS } from "@/config/timings";
import { SITE_URL } from "@/config/siteUrl";
import type { QuizCard } from "@/data/quiz-cards";
import { buildTagMap, MAX_ACTIVE_QUIZ_CARDS } from "@/data/quiz-cards";
import { readCache, writeCache } from "@/lib/startupCache";
import { toAbsoluteAssetUrl } from "@/lib/validators";

type Screen = "splash" | "welcome" | "loading_quiz" | "quiz" | "result" | "success";

// ── Per-screen directional transitions ────────────────────────────────────────────────
const screenAnim: Record<Screen, { initial: TargetAndTransition; animate: TargetAndTransition; exit: TargetAndTransition; transition: Transition }> = {
  loading_quiz: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    exit:       { opacity: 0, y: -16 },
    transition: { duration: 0.3, ease: "easeOut" },
  },
  splash: {
    initial:    { opacity: 0 },
    animate:    { opacity: 1 },
    exit:       { opacity: 0, scale: 1.04 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  welcome: {
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0  },
    exit:       { opacity: 0, y: -16, scale: 0.98 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  quiz: {
    initial:    { opacity: 0, x: 48 },
    animate:    { opacity: 1, x: 0  },
    exit:       { opacity: 0, x: -48 },
    transition: { duration: 0.35, ease: "easeOut" },
  },
  result: {
    initial:    { opacity: 0, scale: 0.94, y: 32 },
    animate:    { opacity: 1, scale: 1,    y: 0   },
    exit:       { opacity: 0, scale: 1.04          },
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  success: {
    initial:    { opacity: 0, y: 52 },
    animate:    { opacity: 1, y: 0  },
    exit:       { opacity: 0, y: -24 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

// Fire-and-forget funnel event — never blocks the user flow.
function trackFunnel(funnelKey: string, eventType: "quiz_started" | "result_shown" | "claimed") {
  supabase.from("quiz_funnel_events").insert({
    funnel_key: funnelKey,
    event_type: eventType,
    store_id: getStoredStoreId(),
  }).then(({ error }) => {
    if (error) console.error("[suaipe] funnel event failed:", eventType, error);
  }, (err) => {
    // Network rejection — keep flow alive, just log it.
    console.error("[suaipe] funnel event rejected:", eventType, err);
  });
}

const Index = () => {
  const { t, lang } = useLang();
  const { isKioskLocked, deactivateKiosk } = useKioskMode();
  const isOnline = useOnlineStatus();
  const [showKioskLock, setShowKioskLock] = useState(isKioskLocked);
  const [screen, setScreen] = useState<Screen>("splash");
  const [user, setUser] = useState<UserInfo>({ nome: "", cognome: "", email: "", consentGivenAt: "" });
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchPercent, setMatchPercent] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean>>({});
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState(false);
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState<number | null>(null);
  const [funnelKey, setFunnelKey] = useState(() => crypto.randomUUID());
  const [activeProductIds, setActiveProductIds] = useState<Set<string> | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [videoOverrides, setVideoOverrides] = useState<Record<string, string>>({});
  const [discountOverrides, setDiscountOverrides] = useState<Record<string, number>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [quizCards, setQuizCards] = useState<QuizCard[] | null>(null);
  const [tagMap, setTagMap] = useState<Record<number, string> | undefined>(undefined);

  useEffect(() => {
    const storeId = getStoredStoreId() ?? "rio-de-janeiro";
    const cacheKey = `startup_${storeId}`;

    interface StartupSnapshot {
      settingsData: typeof settingsData;
      customData: typeof customData;
      globalData: typeof globalData;
      cardsData: QuizCard[];
    }

    // Inline type helpers to avoid re-declaring per-closure.
    type SettingsRow  = { product_id: string; active: boolean; price_override: string | null; image_url: string | null; video_url: string | null; discount_percent: number | null };
    type CustomRow    = { id: string; name: string; description: string; price: string; rating: number; image_url: string | null; video_url: string | null; tags: string[]; faq: { q: string; a: string }[] };
    type GlobalRow    = { product_id: string; hidden: boolean };
    // Needed to narrow the type alias used inside applySnapshot
    const settingsData: SettingsRow[] = [];
    const customData:   CustomRow[]   = [];
    const globalData:   GlobalRow[]   = [];

    function applySnapshot(snap: StartupSnapshot) {
      const hiddenIds = new Set(
        snap.globalData.filter((r) => r.hidden).map((r) => r.product_id),
      );
      const customProductList: Product[] = snap.customData.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        price: r.price,
        rating: r.rating,
        image: r.image_url ?? "/products/placeholder.png",
        videoUrl: r.video_url ?? "#",
        tags: r.tags ?? [],
        faq: r.faq ?? [],
      }));
      // The whole catalog now lives in custom_products — no hardcoded base
      // products are spread in any more.
      const merged = customProductList.filter((p) => !hiddenIds.has(p.id));
      setAllProducts(merged);

      const data = snap.settingsData;
      if (data && data.length > 0) {
        const active = new Set(
          data.filter((r) => r.active !== false).map((r) => r.product_id),
        );
        // Custom products default to active, but respect an explicit per-store
        // deactivation: only auto-add ones without a product_settings row.
        const settingsIds = new Set(data.map((r) => r.product_id));
        customProductList.forEach((p) => {
          if (!hiddenIds.has(p.id) && !settingsIds.has(p.id)) active.add(p.id);
        });
        const prices: Record<string, string>  = {};
        const images: Record<string, string>  = {};
        const videos: Record<string, string>  = {};
        const discounts: Record<string, number> = {};
        data.forEach((r) => {
          if (r.price_override)  prices[r.product_id]    = r.price_override;
          if (r.image_url)       images[r.product_id]    = r.image_url;
          if (r.video_url)       videos[r.product_id]    = r.video_url;
          if (r.discount_percent) discounts[r.product_id] = r.discount_percent;
        });
        setActiveProductIds(active);
        setPriceOverrides(prices);
        setVideoOverrides(videos);
        setImageOverrides(images);
        setDiscountOverrides(discounts);
      } else {
        setActiveProductIds(new Set(merged.map((p) => p.id)));
      }
      if (snap.cardsData.length > 0) {
        // Defensive cap — never expose more than the fixed 8 swipes, even if a
        // stale cache or a direct DB edit left more than 8 cards active.
        const capped = snap.cardsData.slice(0, MAX_ACTIVE_QUIZ_CARDS);
        setQuizCards(capped);
        setTagMap(buildTagMap(capped));
      }
      // Cache hit + live refresh both mark loaded — idempotent via React state batching.
      setSettingsLoaded(true);
    }

    // Stale-while-revalidate: serve cache instantly, then refresh in background.
    const cached = readCache<StartupSnapshot>(cacheKey);
    if (cached) applySnapshot(cached);

    Promise.all([
      supabase
        .from("product_settings")
        .select("product_id, active, price_override, image_url, video_url, discount_percent")
        .eq("store_id", storeId),
      supabase
        .from("custom_products")
        .select("id, name, description, price, rating, image_url, video_url, tags, faq")
        .eq("status", "active"),
      supabase
        .from("product_global_status")
        .select("product_id, hidden"),
      supabase
        .from("quiz_cards")
        .select("id, emoji, image_url, tag, sort_order, active, text_it, text_en, text_pt, text_es, text_fr")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(MAX_ACTIVE_QUIZ_CARDS),
    ]).then(([settingsRes, customRes, globalRes, cardsRes]) => {
      if (settingsRes.error) {
        console.error("[suaipe] product_settings fetch failed:", settingsRes.error);
        if (!cached) setSettingsLoadFailed(true);
      }

      const snap: StartupSnapshot = {
        settingsData: (settingsRes.data ?? []) as SettingsRow[],
        customData:   (customRes.data   ?? []) as CustomRow[],
        globalData:   (globalRes.data   ?? []) as GlobalRow[],
        cardsData:    (!cardsRes.error && cardsRes.data && cardsRes.data.length > 0)
          ? (cardsRes.data as QuizCard[])
          : [],
      };

      writeCache(cacheKey, snap);
      applySnapshot(snap);
    }).catch((err) => {
      // Network rejection (vs. a Supabase error object handled above) would
      // otherwise leave settingsLoaded=false forever and the kiosk stuck on the
      // spinner until the 10 s fallback timeout fires.
      console.error("[suaipe] startup Promise.all rejected:", err);
      if (!cached) setSettingsLoadFailed(true);
      setSettingsLoaded(true);
    });
  }, []);

  // Fallback: if startup data doesn't arrive within 10 s, force progress so the
  // kiosk never gets permanently stuck on the loading screen.
  useEffect(() => {
    if (settingsLoaded) return;
    const timer = setTimeout(() => {
      setSettingsLoadFailed(true);
      setSettingsLoaded(true);
    }, 10_000);
    return () => clearTimeout(timer);
  }, [settingsLoaded]);

  // Transition out of loading screen once settings are ready
  useEffect(() => {
    if (settingsLoaded && screen === "loading_quiz") setScreen("quiz");
  }, [settingsLoaded, screen]);

  const handleSplashComplete = () => {
    setScreen("welcome");
  };

  const handleStart = (userInfo: UserInfo) => {
    setUser(userInfo);
    trackFunnel(funnelKey, "quiz_started");
    // If product settings haven't loaded yet, show a brief loading screen
    // so the quiz always starts with the correct active-product set.
    setScreen(settingsLoaded ? "quiz" : "loading_quiz");
  };

  const handleQuizComplete = (answers: Record<number, boolean>) => {
    const { product: baseProduct, matchPercent: pct } = getMatchedProduct(answers, activeProductIds ?? undefined, allProducts, tagMap);
    // Apply store-specific overrides (price + image) set by manager
    const priceOverride = baseProduct && priceOverrides[baseProduct.id];
    const imageOverride = baseProduct && imageOverrides[baseProduct.id];
    const product = baseProduct ? {
      ...baseProduct,
      ...(priceOverride ? { price: priceOverride } : {}),
      ...(imageOverride ? { image: imageOverride } : {}),
    } : baseProduct;
    setMatchedProduct(product);
    setMatchPercent(pct);
    setQuizAnswers(answers);
    trackFunnel(funnelKey, "result_shown");
    setScreen("result");
  };

  // Email is collected on the welcome screen — user.email is already set when
  // handleClaim fires. We just persist the session and advance to success.
  const handleClaim = async () => {
    if (!matchedProduct || claiming) return;

    // Hard guard: a session without a configured store must NOT be silently
    // assigned to a default — that would attribute it to the wrong location
    // and corrupt per-store analytics. Surface the error so staff fixes it.
    const storeId = getStoredStoreId();
    if (!storeId) {
      console.error("[suaipe] No store_id configured — claim aborted.");
      setClaimError(true);
      return;
    }

    setClaimError(false);
    setClaiming(true);

    const payload = {
      email: user.email,
      answers: quizAnswers,
      matched_product_id: matchedProduct.id,
      match_percent: matchPercent,
      email_sent: false,
      nome: user.nome,
      cognome: user.cognome,
      store_id: storeId,
      // Product snapshot — used by the Edge Function to build the email.
      // Video falls back to the product's own video_url when no per-store
      // override exists (custom products carry their own link).
      product_name:  matchedProduct.name,
      product_price: matchedProduct.price,
      // Resolve to an absolute URL so the match email can render it. Bundled
      // fallback assets are root-relative ("/products/x.png") and would never
      // load in an email client; custom products carry absolute Storage URLs.
      product_image: toAbsoluteAssetUrl(matchedProduct.image, SITE_URL),
      product_video: videoOverrides[matchedProduct.id]
        ?? (matchedProduct.videoUrl && matchedProduct.videoUrl !== "#" ? matchedProduct.videoUrl : null),
      discount_percent: discountOverrides[matchedProduct.id] ?? 5,
      language: lang,
      // GDPR Art. 7(1) — demonstrable record of consent at the moment
      // the customer ticked the privacy checkbox on the welcome screen.
      consent_given_at: user.consentGivenAt,
    };

    // Retry up to 2 times with exponential backoff before giving up.
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** (attempt - 1)));
      const { error } = await supabase.from("quiz_sessions").insert(payload);
      if (!error) { lastError = null; break; }
      lastError = error;
    }
    if (lastError) {
      console.error("[suaipe] quiz_sessions insert failed:", lastError);
      setClaiming(false);
      setClaimError(true);
      return;
    }

    // Google Sheets relay is handled server-side in the on-session-created Edge Function.
    trackFunnel(funnelKey, "claimed");
    setClaimError(false);
    setClaiming(false);
    setScreen("success");
  };

  const handleRestart = () => {
    // Wipe the previous visitor's cooldown marker so the next person on
    // this shared kiosk starts completely fresh (no false cooldown carry-over).
    try {
      if (user.email) sessionStorage.removeItem(`wb_cooldown_${user.email.trim().toLowerCase()}`);
    } catch { /* storage unavailable */ }
    setUser({ nome: "", cognome: "", email: "", consentGivenAt: "" });
    setMatchedProduct(null);
    setMatchPercent(0);
    setQuizAnswers({});
    setInactivitySecondsLeft(null);
    setClaimError(false);
    setFunnelKey(crypto.randomUUID());
    setScreen("splash");
  };

  useWakeLock();
  // Lock the document to a fixed, no-scroll viewport while the kiosk route
  // is mounted — admin routes (/manager, /stats, /consulente) keep their
  // normal document scroll because they don't call this hook.
  useLockBodyScroll();
  useBgMusic(screen === "splash",                                          "attract");
  useBgMusic(screen === "welcome",                                         "welcome");
  useBgMusic(screen === "quiz" || screen === "result",                     "quiz");
  const { dismiss } = useInactivityReset({
    enabled: screen !== "welcome" && screen !== "splash" && screen !== "loading_quiz",
    timeout: screen === "result" ? RESULT_INACTIVITY_TIMEOUT_MS : undefined,
    onWarn:    (seconds) => setInactivitySecondsLeft(seconds),
    onReset:   handleRestart,
    onDismiss: () => setInactivitySecondsLeft(null),
  });

  const handleDismiss = () => {
    setInactivitySecondsLeft(null);
    dismiss();
  };

  const anim = screenAnim[screen];

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Offline banner — shown whenever the device loses network */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -32 }}
            className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg"
          >
            {t.welcome.offlineBanner}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showKioskLock && (
          <KioskLockScreen
            key="kiosk-lock"
            onStartQuiz={() => setShowKioskLock(false)}
            onDeactivate={() => { deactivateKiosk(); setShowKioskLock(false); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inactivitySecondsLeft !== null && (
          <motion.div
            key="inactivity-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={handleDismiss}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t.inactivity.title}
              className="mx-6 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 text-5xl">⏱️</div>
              <h2 className="mb-2 text-xl font-bold text-foreground">{t.inactivity.title}</h2>
              <p className="mb-6 text-sm text-muted-foreground">{t.inactivity.countdown}</p>
              <div className="mb-6 flex items-center justify-center">
                <span className="text-6xl font-bold text-rose-500">{inactivitySecondsLeft}</span>
                <span className="ml-2 text-2xl text-muted-foreground">s</span>
              </div>
              <button
                onClick={handleDismiss}
                className="mb-3 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground active:opacity-90"
              >
                {t.inactivity.dismiss}
              </button>
              <button
                onClick={handleRestart}
                className="w-full rounded-xl border border-border bg-muted px-6 py-3 font-semibold text-muted-foreground active:bg-muted/70"
              >
                {t.inactivity.restart}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={anim.initial}
          animate={anim.animate}
          exit={anim.exit}
          transition={anim.transition}
        >
          {screen === "splash" && <AttractScreen onComplete={handleSplashComplete} />}
          {screen === "welcome" && <WelcomeScreen onStart={handleStart} settingsLoadFailed={settingsLoadFailed} />}
          {screen === "loading_quiz" && (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
              <div className="max-w-xs w-full space-y-8">
                <motion.div
                  className="text-7xl"
                  animate={{ rotate: [0, -14, 14, -10, 10, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  🃏
                </motion.div>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">{t.quiz.loadingCards}</p>
                  <p className="text-sm text-muted-foreground">{t.quiz.loadingCardsSub}</p>
                </div>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, delay: i * 0.22, repeat: Infinity }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {screen === "quiz" && <QuizScreen onComplete={handleQuizComplete} cards={quizCards ?? undefined} />}
          {screen === "result" && matchedProduct && (
            <MatchResult
              product={matchedProduct}
              matchPercent={matchPercent}
              userName={user.nome}
              userEmail={user.email}
              onClaim={handleClaim}
              onChangeEmail={(email) => setUser((u) => ({ ...u, email }))}
              claiming={claiming}
              claimError={claimError}
              isOnline={isOnline}
            />
          )}
          {screen === "success" && matchedProduct && (
            <SuccessScreen
              email={user.email}
              userName={`${user.nome} ${user.cognome}`}
              productName={matchedProduct.name}
              onRestart={handleRestart}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Index;
