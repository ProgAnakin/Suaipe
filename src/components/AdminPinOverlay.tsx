import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { STORES, setStoredStoreId, getStoredStoreId } from "@/data/stores";
import { useLang } from "@/i18n/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useKioskMode } from "@/hooks/useKioskMode";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";
import { verifyStaffPin } from "@/lib/verifyStaffPin";

// PIN validation is server-side via Supabase RPC (verify_staff_pin).
// Lockout + attempt logging are also managed server-side.

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

type Step = "pin" | "store";

interface AdminPinOverlayProps {
  onClose: () => void;
}

const AdminPinOverlay = ({ onClose }: AdminPinOverlayProps) => {
  const { t } = useLang();
  const { isKioskLocked, activateKiosk, deactivateKiosk, isStandalone } = useKioskMode();
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { lockedSeconds, isLocked, setLockedSeconds } = useLockoutCountdown();
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(getStoredStoreId);
  const [savedStoreId, setSavedStoreId] = useState<string | null>(null); // for visual confirmation
  const navigate = useNavigate();
  const pinDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(pinDialogRef, onClose, step === "pin");

  const handleKey = useCallback(async (key: string) => {
    if (isLocked || verifying) return;

    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);

    if (next.length === 4) {
      setVerifying(true);
      const result = await verifyStaffPin(next);
      setVerifying(false);

      if (result?.valid === true) {
        setTimeout(() => setStep("store"), 300);
      } else {
        if (result?.locked_seconds && result.locked_seconds > 0) {
          setLockedSeconds(result.locked_seconds);
        }
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
        }, 600);
      }
    }
  }, [pin, isLocked, verifying, setLockedSeconds]);

  const handleSelectStore = (storeId: string) => {
    setStoredStoreId(storeId);
    setCurrentStoreId(storeId);
    setSavedStoreId(storeId); // triggers visual confirmation
    // Brief flash, then clear
    setTimeout(() => setSavedStoreId(null), 1500);
  };

  // ─── Store selection step ──────────────────────────────────────────────
  if (step === "store") {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="mx-6 w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="mb-5 text-center">
            <div className="mb-2 text-4xl">📍</div>
            <h2 className="text-lg font-bold text-foreground">{t.admin.storeStep.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.admin.storeStep.subtitle}
            </p>
          </div>

          {/* Store list */}
          <div className="space-y-2">
            {STORES.map((store) => {
              const isActive = store.id === currentStoreId;
              const justSaved = store.id === savedStoreId;
              return (
                <motion.button
                  key={store.id}
                  onClick={() => handleSelectStore(store.id)}
                  className={`w-full rounded-2xl border px-5 py-3.5 text-left transition-all active:scale-95 ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-foreground hover:border-primary/40"
                  }`}
                  whileTap={{ scale: 0.97 }}
                  animate={justSaved ? { scale: [1, 1.03, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{store.name}</span>
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="text-xs font-bold text-primary"
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="mt-5 space-y-2.5">
            <motion.button
              onClick={() => { onClose(); }}
              disabled={!currentStoreId}
              className="gradient-primary shadow-glow w-full rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground active:scale-95 disabled:opacity-40"
              whileTap={{ scale: 0.97 }}
            >
              {t.admin.storeStep.saveAndReturn}
            </motion.button>
            <motion.button
              onClick={() => navigate("/stats")}
              className="w-full rounded-2xl border border-border bg-secondary px-6 py-3.5 text-sm font-semibold text-foreground active:scale-95"
              whileTap={{ scale: 0.97 }}
            >
              {t.admin.storeStep.goToAnalytics}
            </motion.button>
            <motion.button
              onClick={() => navigate("/consulente")}
              className="w-full rounded-2xl border border-sky-500/40 bg-sky-500/10 px-6 py-3.5 text-sm font-semibold text-sky-400 active:scale-95"
              whileTap={{ scale: 0.97 }}
            >
              {t.admin.storeStep.goToConsulente}
            </motion.button>
          </div>

          {/* Kiosk mode toggle */}
          <div className="mt-4 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {isKioskLocked ? t.admin.storeStep.kioskActive : t.admin.storeStep.kioskInactive}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                  {isKioskLocked
                    ? t.admin.storeStep.kioskActiveDesc
                    : t.admin.storeStep.kioskInactiveDesc}
                </p>
              </div>
              <motion.button
                onClick={isKioskLocked ? deactivateKiosk : activateKiosk}
                className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                  isKioskLocked
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {isKioskLocked ? t.admin.storeStep.deactivate : t.admin.storeStep.activate}
              </motion.button>
            </div>

            {/* In a plain Safari tab the iOS keyboard exits the Fullscreen API.
                Tell staff to install the PWA so kiosk survives data entry. */}
            {!isStandalone && (
              <p className="mt-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-300">
                {t.admin.storeStep.kioskInstallHint}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ─── PIN step ────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={pinDialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-pin-title"
        className="mx-6 w-full max-w-xs rounded-3xl border border-border bg-card p-8 shadow-2xl"
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🔐</div>
          <h2 id="admin-pin-title" className="text-lg font-bold text-foreground">{t.admin.pinStep.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.admin.pinStep.subtitle}</p>
        </div>

        {/* Locked banner */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-xs text-destructive"
            >
              {t.changeEmail.tooManyAttempts(lockedSeconds)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* PIN dots */}
        <motion.div
          className="mb-8 flex justify-center gap-4"
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-4 w-4 rounded-full border-2 border-primary"
              animate={{
                backgroundColor: i < pin.length ? "hsl(var(--primary))" : "transparent",
                scale: i === pin.length - 1 && pin.length > 0 ? [1, 1.3, 1] : 1,
              }}
              transition={{ duration: 0.15 }}
            />
          ))}
        </motion.div>

        {/* Verifying indicator */}
        {verifying && (
          <p className="mb-3 text-center text-xs text-muted-foreground animate-pulse">{t.changeEmail.verifying}</p>
        )}

        {/* Numeric keypad — kiosk-friendly tap targets (≥64px) */}
        <div className={`grid grid-cols-3 gap-3 ${isLocked || verifying ? "pointer-events-none opacity-40" : ""}`}>
          {KEYS.map((key, i) => (
            key === "" ? (
              <div key={i} />
            ) : (
              <motion.button
                key={i}
                onClick={() => handleKey(key)}
                aria-label={key === "⌫" ? "Backspace" : `Digit ${key}`}
                className={`flex h-16 items-center justify-center rounded-2xl text-xl font-semibold transition-colors ${
                  key === "⌫"
                    ? "bg-muted text-muted-foreground"
                    : "bg-secondary text-foreground hover:bg-primary/20 active:bg-primary/30"
                }`}
                whileTap={{ scale: 0.92 }}
              >
                {key}
              </motion.button>
            )
          ))}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="mt-5 w-full text-center text-sm text-muted-foreground underline underline-offset-2"
        >
          {t.admin.pinStep.cancel}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default AdminPinOverlay;
