import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SuaipeLogo } from "./SuaipeLogo";
import { useLang } from "@/i18n/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";
import { verifyStaffPin } from "@/lib/verifyStaffPin";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

interface KioskLockScreenProps {
  onStartQuiz: () => void;
  onDeactivate: () => void;
}

export const KioskLockScreen = ({ onStartQuiz, onDeactivate }: KioskLockScreenProps) => {
  const { t } = useLang();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { lockedSeconds, isLocked, setLockedSeconds } = useLockoutCountdown();
  const pinDialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(pinDialogRef, () => { setShowPin(false); setPin(""); }, showPin);

  const handleKey = useCallback(async (key: string) => {
    if (isLocked || verifying) return;
    if (key === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;

    const next = pin + key;
    setPin(next);
    if (next.length < 4) return;

    setVerifying(true);
    const result = await verifyStaffPin(next);
    setVerifying(false);

    if (result?.valid === true) {
      onDeactivate();
    } else {
      if (result?.locked_seconds && result.locked_seconds > 0) {
        setLockedSeconds(result.locked_seconds);
      }
      setShake(true);
      setTimeout(() => { setShake(false); setPin(""); }, 600);
    }
  }, [pin, isLocked, verifying, onDeactivate, setLockedSeconds]);

  // ── PIN entry view ─────────────────────────────────────────────────
  if (showPin) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <motion.div
          ref={pinDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kiosk-pin-title"
          className="mx-6 w-full max-w-xs rounded-3xl border border-border bg-card p-8 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">🔑</div>
            <h2 id="kiosk-pin-title" className="text-lg font-bold text-foreground">{t.admin.kioskLock.pinTitle}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t.admin.kioskLock.pinSubtitle}</p>
          </div>

          <AnimatePresence>
            {isLocked && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-center text-xs text-destructive"
              >
                {t.admin.kioskLock.tooManyAttempts(lockedSeconds)}
              </motion.div>
            )}
          </AnimatePresence>

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

          {verifying && (
            <p className="mb-3 text-center text-xs text-muted-foreground animate-pulse">{t.admin.kioskLock.verifying}</p>
          )}

          {/* Numeric keypad — kiosk-friendly tap targets (≥64px) */}
          <div className={`grid grid-cols-3 gap-3 ${isLocked || verifying ? "pointer-events-none opacity-40" : ""}`}>
            {KEYS.map((key, i) =>
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
              ),
            )}
          </div>

          <button
            onClick={() => { setShowPin(false); setPin(""); }}
            className="mt-5 w-full text-center text-sm text-muted-foreground underline underline-offset-2"
          >
            {t.admin.kioskLock.cancel}
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main lock screen ─────────────────────────────────────────────────
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        <SuaipeLogo size={48} />

        <motion.div
          className="text-7xl"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          🔒
        </motion.div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.admin.kioskLock.lockTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.admin.kioskLock.lockSubtitle}
          </p>
        </div>

        <motion.button
          onClick={onStartQuiz}
          className="mt-2 w-full max-w-xs rounded-2xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg active:opacity-90"
          whileTap={{ scale: 0.97 }}
        >
          {t.admin.kioskLock.startQuiz}
        </motion.button>

        <button
          onClick={() => setShowPin(true)}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          {t.admin.kioskLock.deactivateKiosk}
        </button>
      </div>
    </motion.div>
  );
};
