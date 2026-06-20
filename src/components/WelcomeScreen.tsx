import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import DiscoveryBackground from "./DiscoveryBackground";
import AdminPinOverlay from "./AdminPinOverlay";
import { PrivacyNotice } from "./PrivacyNotice";
import { SuaipeLogo } from "./SuaipeLogo";
import { useSound } from "@/hooks/useSound";
import { useLang } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";
import { getStoredStoreId, getStoreById } from "@/data/stores";
import { supabase } from "@/integrations/supabase/client";
import { useViewportKeyboard } from "@/hooks/useViewportKeyboard";
import { isValidEmail, isValidName, sanitizeName } from "@/lib/validators";
import { COOLDOWN_BYPASS_EMAILS } from "@/config/staffEmails";

export interface UserInfo {
  nome: string;
  cognome: string;
  email: string;
  /** ISO timestamp captured the moment the customer ticked the consent
   *  checkbox and started the flow — written to quiz_sessions for GDPR
   *  Art. 7(1) "demonstrate consent" compliance. */
  consentGivenAt: string;
}

interface WelcomeScreenProps {
  onStart: (user: UserInfo) => void;
  settingsLoadFailed?: boolean;
}

// Email/name validation + sanitize live in src/lib/validators.ts (shared with the
// Edge Function copy, covered by src/__tests__/welcomeValidators.test.ts).

// ─── Language Selector ───────────────────────────────────────────────────────────────────────
const LanguageSelector = () => {
  const { lang, setLang } = useLang();
  return (
    <div className="flex items-center gap-1.5">
      {LANGUAGES.map(({ code, flag, label }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
            lang === code
              ? "bg-primary text-primary-foreground shadow-sm scale-105"
              : "bg-card/80 text-muted-foreground border border-border/60 hover:bg-card"
          }`}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

// ─── Welcome Form ───────────────────────────────────────────────────────────────────────────
const WelcomeForm = ({ onStart }: { onStart: (user: UserInfo) => void }) => {
  const { t } = useLang();
  useViewportKeyboard();
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldownHours, setCooldownHours] = useState<number | null>(null);
  // GDPR consent: must be explicitly granted before the customer's email is
  // captured. The modal shows the same notice rendered at /privacy.
  const [consent, setConsent] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { play } = useSound();

  const isEmailValid   = isValidEmail(email);
  const isNomeValid    = isValidName(nome);
  const isCognomeValid = isValidName(cognome);
  const isFormValid    = isNomeValid && isCognomeValid && isEmailValid;

  const showEmailError  = emailTouched && email.trim().length > 0 && !isEmailValid;
  const showEmailOk     = email.trim().length > 0 && isEmailValid && cooldownHours === null;
  const showNomeError    = submitted && !isNomeValid;
  const showCognomeError = submitted && !isCognomeValid;

  const handleNome = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNome(sanitizeName(e.target.value));
    setSubmitted(false);
  }, []);

  const handleCognome = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCognome(sanitizeName(e.target.value));
    setSubmitted(false);
  }, []);

  const handleEmail = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailTouched(true);
    setCooldownHours(null);
  }, []);

  const handleStart = useCallback(async () => {
    setSubmitted(true);
    setEmailTouched(true);
    if (!isFormValid || checking) return;
    if (!consent) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!COOLDOWN_BYPASS_EMAILS.has(normalizedEmail)) {
      setChecking(true);
      try {
        const { data } = await supabase.rpc("check_email_cooldown", {
          p_email: normalizedEmail,
        });
        if (data?.[0]?.in_cooldown && (data[0].hours_remaining as number) > 0) {
          setCooldownHours(Math.max(1, Math.ceil(data[0].hours_remaining as number)));
          setChecking(false);
          return;
        }
      } catch {
        const ssKey = `wb_cooldown_${normalizedEmail}`;
        const lastAttempt = sessionStorage.getItem(ssKey);
        if (lastAttempt) {
          const diffMs = Date.now() - parseInt(lastAttempt, 10);
          const cooldownMs = 60 * 60 * 1000;
          if (diffMs < cooldownMs) {
            setCooldownHours(Math.ceil((cooldownMs - diffMs) / 3600000));
            setChecking(false);
            return;
          }
        }
        sessionStorage.setItem(ssKey, String(Date.now()));
      }
      setChecking(false);
    }
    play("start");
    onStart({
      nome: nome.trim(),
      cognome: cognome.trim(),
      email: normalizedEmail,
      consentGivenAt: new Date().toISOString(),
    });
  }, [isFormValid, checking, consent, nome, cognome, email, play, onStart]);

  const showConsentError = submitted && isFormValid && !consent;

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleStart();
  }, [handleStart]);

  const nomeClass = `w-full rounded-2xl border bg-card px-4 py-4 text-center text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
    showNomeError ? "border-destructive focus:ring-destructive" : isNomeValid && nome.length > 0 ? "border-green-500 focus:ring-green-400" : "border-border focus:ring-primary"
  }`;
  const cognomeClass = `w-full rounded-2xl border bg-card px-4 py-4 text-center text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
    showCognomeError ? "border-destructive focus:ring-destructive" : isCognomeValid && cognome.length > 0 ? "border-green-500 focus:ring-green-400" : "border-border focus:ring-primary"
  }`;
  const emailClass = `w-full rounded-2xl border bg-card px-6 py-4 pr-14 text-center text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
    cooldownHours !== null ? "border-amber-400 focus:ring-amber-400"
    : showEmailOk ? "border-green-500 focus:ring-green-400"
    : showEmailError ? "border-destructive focus:ring-destructive"
    : "border-border focus:ring-primary"
  }`;

  const scrollOnFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
  }, []);

  return (
    <>
    <div className="w-full space-y-3" style={{ paddingBottom: "var(--keyboard-height, 0px)" }}>
      <div className="flex gap-3">
        <div className="flex-1">
          <input type="text" placeholder={t.welcome.firstName} value={nome}
            onChange={handleNome} onKeyDown={onKeyDown} onFocus={scrollOnFocus} autoComplete="given-name" className={nomeClass} />
          {showNomeError && (
            <p className="mt-1 text-center text-xs text-destructive">{t.welcome.firstNameError}</p>
          )}
        </div>
        <div className="flex-1">
          <input type="text" placeholder={t.welcome.lastName} value={cognome}
            onChange={handleCognome} onKeyDown={onKeyDown} onFocus={scrollOnFocus} autoComplete="family-name" className={cognomeClass} />
          {showCognomeError && (
            <p className="mt-1 text-center text-xs text-destructive">{t.welcome.lastNameError}</p>
          )}
        </div>
      </div>

      <div className="relative">
        <input type="email" placeholder={t.welcome.emailPlaceholder}
          value={email} onChange={handleEmail}
          onBlur={() => setEmailTouched(true)}
          onFocus={scrollOnFocus}
          onKeyDown={onKeyDown} autoComplete="email" className={emailClass} />
        {showEmailOk && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
            <CheckCircle2 className="h-5 w-5" />
          </span>
        )}
        {showEmailError && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-destructive">
            <XCircle className="h-5 w-5" />
          </span>
        )}
        {cooldownHours !== null && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
            <Clock className="h-5 w-5" />
          </span>
        )}
      </div>
      {showEmailError && (
        <p className="text-center text-xs text-destructive">{t.welcome.emailError}</p>
      )}
      {cooldownHours !== null && (
        <motion.p
          className="text-center text-xs text-amber-600 font-medium"
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        >
          ⏳ {t.welcome.cooldownError(cooldownHours)}
        </motion.p>
      )}

      {/* GDPR consent — must be explicit before name/email leave the kiosk. */}
      <div className="flex flex-col items-start gap-1 px-2 pt-1">
        <div className="flex items-start gap-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
            />
            <span className="text-sm leading-snug text-muted-foreground select-none">
              {t.welcome.consentLabel}
            </span>
          </label>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="shrink-0 text-xs font-semibold text-primary underline underline-offset-2"
          >
            {t.welcome.consentRead}
          </button>
        </div>
        {showConsentError && (
          <p className="text-xs text-destructive pl-6">{t.welcome.consentRequired}</p>
        )}
      </div>

      <motion.button
        onClick={handleStart}
        disabled={checking}
        className="gradient-primary shadow-glow w-full rounded-2xl px-8 py-5 text-xl font-bold text-primary-foreground active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        whileTap={{ scale: checking ? 1 : 0.97 }}
      >
        {checking ? "…" : t.welcome.cta}
      </motion.button>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <span>🔒</span>
          <span>{t.welcome.privacy}</span>
        </div>
        <p className="text-center text-[11px] text-muted-foreground/70">{t.welcome.noSpam}</p>
      </div>
    </div>

    {/* Privacy notice modal — opened from the consent checkbox row */}
    <AnimatePresence>
      {showPrivacyModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setShowPrivacyModal(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl"
            initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPrivacyModal(false)}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XCircle className="h-5 w-5" />
            </button>
            <PrivacyNotice />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

// ─── Store Badge ────────────────────────────────────────────────────────────────────────────
const StoreBadge = ({ onTap, refreshKey }: { onTap: () => void; refreshKey: number }) => {
  const { t } = useLang();
  const storeId = getStoredStoreId();
  const store = storeId ? getStoreById(storeId) : null;
  void refreshKey;
  return (
    <button
      onClick={onTap}
      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-card"
    >
      <span className="text-base">📍</span>
      {store ? (
        <span className="font-medium text-foreground">{store.shortName}</span>
      ) : (
        <span className="font-medium text-red-500">{t.welcome.noStore}</span>
      )}
    </button>
  );
};

// ─── Welcome Screen ────────────────────────────────────────────────────────────────────────────
const LOGO_TAPS_REQUIRED = 6;

const WelcomeScreen = ({ onStart, settingsLoadFailed = false }: WelcomeScreenProps) => {
  const { t } = useLang();
  const [showPin, setShowPin] = useState(false);
  const [storeBadgeKey, setStoreBadgeKey] = useState(0);
  // Mirror tapCount.current to React state once it passes the discoverability
  // threshold so a subtle dot indicator can render — gives new staff a visual
  // cue that they're on the right track to opening the admin overlay.
  const [tapsVisible, setTapsVisible] = useState(0);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleLogoTap = useCallback(() => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    setTapsVisible(tapCount.current >= 3 ? tapCount.current : 0);
    if (tapCount.current >= LOGO_TAPS_REQUIRED) {
      tapCount.current = 0;
      setTapsVisible(0);
      setShowPin(true);
    } else {
      tapTimer.current = setTimeout(() => {
        tapCount.current = 0;
        setTapsVisible(0);
      }, 2000);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-8">
      <DiscoveryBackground />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <span className="text-[10px] text-muted-foreground/40 select-none">
          © {new Date().getFullYear()} Suaipe · Suaipe
        </span>
      </div>

      <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-1.5">
        <StoreBadge onTap={() => setShowPin(true)} refreshKey={storeBadgeKey} />
        {settingsLoadFailed && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400">
            {t.welcome.catalogOffline}
          </span>
        )}
      </div>

      <AnimatePresence>
        {showPin && (
          <AdminPinOverlay
            onClose={() => {
              setShowPin(false);
              setStoreBadgeKey((k) => k + 1);
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-5"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <motion.div
          onClick={handleLogoTap}
          className="cursor-pointer"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <SuaipeLogo size={96} />
        </motion.div>

        {/* Subtle dot progress — only shown from the 3rd tap onward so the
            easter-egg stays hidden from customers but new staff can see they
            are unlocking something. */}
        <AnimatePresence>
          {tapsVisible > 0 && (
            <motion.div
              key="taps-hint"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="-mt-3 flex items-center gap-1.5"
            >
              {Array.from({ length: LOGO_TAPS_REQUIRED }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i < tapsVisible ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="mb-1 text-5xl font-bold uppercase tracking-widest">
            <span className="text-gradient">SUAIPE</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t.welcome.tagline}</p>
        </motion.div>

        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="h-1.5 w-8 rounded-full" style={{ background: "hsl(217, 91%,55%)" }} />
          <div className="h-1 w-5 rounded-full bg-muted-foreground/25" />
          <div className="h-1 w-5 rounded-full bg-muted-foreground/25" />
          <span className="ml-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
            01
          </span>
        </motion.div>

        <motion.p
          className="text-center text-sm text-muted-foreground/80 leading-relaxed px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.38 }}
        >
          {t.welcome.subtitle}
        </motion.p>

        <WelcomeForm onStart={onStart} />
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
