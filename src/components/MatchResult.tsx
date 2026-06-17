import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import type { Product } from "@/data/products";
import { useSound } from "@/hooks/useSound";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { useLang } from "@/i18n/LanguageContext";
import { useLockoutCountdown } from "@/hooks/useLockoutCountdown";
import { verifyStaffPin } from "@/lib/verifyStaffPin";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const EMAIL_TAPS  = 5;
const PIN_KEYS: (number | "⌫" | "")[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"];

interface MatchResultProps {
  product: Product;
  matchPercent: number;
  userName: string;
  userEmail: string;
  onClaim: () => void;
  onChangeEmail: (email: string) => void;
  claiming?: boolean;
  claimError?: boolean;
  isOnline?: boolean;
}

// Brand confetti palette: oranges, blues, amber, white. All indexes map to
// the --confetti-N variables in index.css.
const BRAND_CONFETTI_INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // orange range + navy blues + amber + white

function readCssConfettiColors(): string[] {
  const style = getComputedStyle(document.documentElement);
  return BRAND_CONFETTI_INDEXES.map((i) => {
    const raw = style.getPropertyValue(`--confetti-${i}`).trim();
    return raw ? `hsl(${raw})` : "#888";
  });
}

// ── Firework burst — particles explode outward from a fixed point ────────────────────
interface BurstCfg { bx: number; by: number; startDelay: number; cycle: number; count: number; }

// 12 positions with fast overlapping cycles — multiple bursts visible at once
const BURST_POSITIONS: BurstCfg[] = [
  { bx: 14, by: 16, startDelay: 0.0, cycle: 2.8, count: 26 },
  { bx: 86, by: 14, startDelay: 0.7, cycle: 3.0, count: 26 },
  { bx: 50, by: 6,  startDelay: 1.4, cycle: 2.9, count: 28 },
  { bx: 18, by: 78, startDelay: 2.1, cycle: 2.7, count: 24 },
  { bx: 82, by: 76, startDelay: 1.0, cycle: 2.8, count: 24 },
  { bx: 50, by: 92, startDelay: 0.3, cycle: 3.0, count: 26 },
  { bx: 28, by: 44, startDelay: 2.4, cycle: 2.9, count: 22 },
  { bx: 72, by: 42, startDelay: 1.7, cycle: 2.7, count: 22 },
  { bx: 8,  by: 55, startDelay: 3.1, cycle: 3.1, count: 20 },
  { bx: 92, by: 52, startDelay: 2.7, cycle: 2.8, count: 20 },
  { bx: 36, by: 22, startDelay: 3.5, cycle: 3.0, count: 22 },
  { bx: 65, by: 68, startDelay: 1.3, cycle: 2.9, count: 22 },
];

// Stable per-particle pseudo-random (no Math.random at render time)
function rnd(seed: number, salt: number): number {
  const x = Math.sin((seed + salt) * 9301 + 49297) * 233280;
  return x - Math.floor(x); // 0–1
}

const FireworkBurst = ({ bx, by, startDelay, cycle, count, colors }: BurstCfg & { colors: string[] }) => (
  <div className="pointer-events-none absolute" style={{ left: `${bx}%`, top: `${by}%` }}>
    {Array.from({ length: count }, (_, i) => {
      const s = i * 7 + Math.floor(bx) * 13 + Math.floor(by) * 3;

      // Angle: evenly distributed + random jitter ±18°
      const angle = (i / count) * Math.PI * 2 + (rnd(s, 1) - 0.5) * 0.63;
      // Distance: 38–130 px
      const dist  = 38 + rnd(s, 2) * 92;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;
      // Gravity tail drift varies per particle
      const gravity = 18 + rnd(s, 3) * 55;

      // Shape selection
      const sr      = rnd(s, 4);
      const isCircle = sr < 0.15;
      const isTail   = sr < 0.30 && !isCircle; // long thin streak
      const isSquare = sr < 0.48 && !isCircle && !isTail;
      // else: ribbon

      const w = isCircle ? 5 + rnd(s, 5) * 5
              : isTail   ? 2 + rnd(s, 5) * 2
              : isSquare ? 5 + rnd(s, 5) * 4
              :            3 + rnd(s, 5) * 3;
      const h = isCircle ? w
              : isTail   ? 14 + rnd(s, 6) * 14 // 14–28 px streak
              : isSquare ? w
              :            w * (2.5 + rnd(s, 6) * 2.2); // ribbon 2.5×–4.7×

      const color    = colors[Math.floor(rnd(s, 7) * colors.length)];
      const dur      = 0.85 + rnd(s, 8) * 0.65; // 0.85–1.5 s
      const rotSpeed = (rnd(s, 9) > 0.5 ? 1 : -1) * (200 + rnd(s, 10) * 480);
      const br       = isCircle ? "50%" : isSquare ? "3px" : "2px";
      const sideWind = (rnd(s, 11) - 0.5) * 28; // random lateral drift at end

      return (
        <motion.div key={i}
          className="absolute"
          style={{
            width: w, height: h,
            marginLeft: -w / 2, marginTop: -h / 2,
            backgroundColor: color,
            borderRadius: br,
            willChange: "transform, opacity",
          }}
          animate={{
            x:       [0, tx * 0.3, tx, tx + sideWind],
            y:       [0, ty * 0.3, ty, ty + gravity],
            opacity: [0, 1, 0.88, 0],
            scale:   [0, 1.5, 1, 0.15],
            rotate:  [0, rotSpeed * 0.4, rotSpeed],
          }}
          transition={{
            duration: dur,
            delay: startDelay + i * 0.022,
            repeat: Infinity,
            repeatDelay: cycle,
            ease: [0.1, 0.55, 0.6, 1],
            times: [0, 0.18, 0.72, 1],
          }}
        />
      );
    })}
  </div>
);

const MatchResult = ({
  product, matchPercent, userName, userEmail,
  onClaim, onChangeEmail, claiming = false, claimError = false,
  isOnline = true,
}: MatchResultProps) => {
  const { t } = useLang();
  const [displayPercent, setDisplayPercent] = useState(0);
  const [imgError, setImgError] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [localClaimError, setLocalClaimError] = useState<null | "invalid_email" | "offline">(null);
  const { play } = useSound();
  const tier = useDevicePerformance();

  // Pre-flight validation: catch problems client-side BEFORE calling onClaim so
  // the user gets specific, actionable feedback (vs. the generic backend error).
  const handleClaim = useCallback(() => {
    if (claiming) return;
    if (!isOnline) { setLocalClaimError("offline"); return; }
    if (!EMAIL_REGEX.test(userEmail.trim())) { setLocalClaimError("invalid_email"); return; }
    setLocalClaimError(null);
    onClaim();
  }, [claiming, isOnline, userEmail, onClaim]);

  // ── Change-email state ────────────────────────────────────────────────────────────────────────────
  const emailTapCount = useRef(0);
  const emailTapTimer = useRef<ReturnType<typeof setTimeout>>();
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [pinVerified, setPinVerified]         = useState(false);
  const [pinValue, setPinValue]               = useState("");
  const [pinError, setPinError]               = useState(false);
  const [pinVerifying, setPinVerifying]       = useState(false);
  const {
    lockedSeconds: pinLockedSeconds,
    setLockedSeconds: setPinLockedSeconds,
  } = useLockoutCountdown();
  const [newEmail, setNewEmail]               = useState("");
  const [newEmailTouched, setNewEmailTouched] = useState(false);

  const confettiColors = useMemo(() => readCssConfettiColors(), []);

  const ringMotionValue = useMotionValue(0);
  const circumference   = 2 * Math.PI * 56;
  const strokeDashoffset = useTransform(ringMotionValue, [0, 100], [circumference, 0]);

  useEffect(() => {
    let frame: number;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (cancelled) return;
      const slotDuration = 900;
      const slotStart = performance.now();
      const runSlot = (now: number) => {
        if (cancelled) return;
        const elapsed  = now - slotStart;
        if (elapsed < slotDuration) {
          const progress = elapsed / slotDuration;
          const speed    = progress > 0.7 ? 1 - ((progress - 0.7) / 0.3) * 0.85 : 1;
          if (Math.random() < speed) setDisplayPercent(Math.floor(Math.random() * 99) + 1);
          frame = requestAnimationFrame(runSlot);
        } else {
          setIsScanning(false);
          play("match");
          animate(ringMotionValue, matchPercent, { duration: 1.8, ease: [0.16, 1, 0.3, 1] });
          const countStart    = performance.now();
          const countDuration = 1800;
          const runCount = (now2: number) => {
            if (cancelled) return;
            const progress = Math.min((now2 - countStart) / countDuration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            setDisplayPercent(Math.round(eased * matchPercent));
            if (progress < 1) frame = requestAnimationFrame(runCount);
          };
          frame = requestAnimationFrame(runCount);
        }
      };
      frame = requestAnimationFrame(runSlot);
    }, 900);
    return () => { cancelled = true; cancelAnimationFrame(frame); clearTimeout(timeout); };
  // play and ringMotionValue are stable refs (useCallback / useMotionValue) — safe to omit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchPercent]);

  const starCount = Math.floor(product.rating);

  // Match-tier palette — mapped onto the Suaipe gradient family
  // (mint success → cyan accent → electric-blue primary → muted indigo).
  // No warm tones: the post-rebrand identity stays cool end-to-end.
  const ringColor = matchPercent >= 90 ? "#5eead4"   // mint (success)
    : matchPercent >= 80 ? "#22d3ee"                  // cyan (accent)
    : matchPercent >= 65 ? "#3b82f6"                  // electric blue (primary)
    : "#6366f1";                                       // indigo (muted match)

  const badgeBg = matchPercent >= 90 ? "bg-teal-400 text-slate-900"
    : matchPercent >= 80 ? "bg-cyan-400 text-slate-900"
    : matchPercent >= 65 ? "bg-blue-500"
    : "bg-indigo-500";

  // ── Email-tap handler ────────────────────────────────────────────────────────────────────────────
  const handleEmailTap = useCallback(() => {
    emailTapCount.current += 1;
    clearTimeout(emailTapTimer.current);
    if (emailTapCount.current >= EMAIL_TAPS) {
      emailTapCount.current = 0;
      setPinValue("");
      setPinError(false);
      setPinVerified(false);
      setNewEmail("");
      setNewEmailTouched(false);
      setShowChangeModal(true);
    } else {
      emailTapTimer.current = setTimeout(() => { emailTapCount.current = 0; }, 2000);
    }
  }, []);

  // ── PIN keypad handler — server-side verification ──────────────────────────────────────────
  const handlePinKey = useCallback(async (key: number | "⌫") => {
    if (pinVerifying || pinLockedSeconds > 0) return;
    if (key === "⌫") { setPinValue((p) => p.slice(0, -1)); setPinError(false); return; }
    if (pinValue.length >= 4) return;
    const next = pinValue + String(key);
    setPinValue(next);
    if (next.length === 4) {
      setPinVerifying(true);
      const result = await verifyStaffPin(next);
      setPinVerifying(false);
      if (result?.valid === true) {
        setTimeout(() => setPinVerified(true), 150);
      } else {
        if (result?.locked_seconds && result.locked_seconds > 0) {
          setPinLockedSeconds(result.locked_seconds);
        }
        setPinError(true);
        setTimeout(() => { setPinValue(""); setPinError(false); }, 700);
      }
    }
  }, [pinValue, pinVerifying, pinLockedSeconds, setPinLockedSeconds]);

  // ── Save new email ──────────────────────────────────────────────────────────────────────────────────
  const handleSaveEmail = useCallback(() => {
    setNewEmailTouched(true);
    if (!EMAIL_REGEX.test(newEmail.trim())) return;
    onChangeEmail(newEmail.trim().toLowerCase());
    setShowChangeModal(false);
    setPinVerified(false);
    setPinValue("");
    setNewEmail("");
    setNewEmailTouched(false);
  }, [newEmail, onChangeEmail]);

  const closeModal = useCallback(() => {
    setShowChangeModal(false);
    setPinVerified(false);
    setPinValue("");
    setPinError(false);
    setPinVerifying(false);
    setPinLockedSeconds(0);
    setNewEmail("");
    setNewEmailTouched(false);
  }, [setPinLockedSeconds]);

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden px-6 py-6">

      {/* ── Background — cosmic dark + match-reactive glow (no filter:blur, iPad Safari safe) ── */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 30%, hsl(230, 55%, 22%) 0%, hsl(230, 60%, 12%) 60%, hsl(230, 65%, 8%) 100%)",
        }}
      >
        {/* Match-reactive glow — colour shifts with match quality */}
        <motion.div
          className="absolute"
          style={{
            left: "50%", top: "42%",
            width: "max(700px, 88vw)", height: "max(700px, 88vw)",
            marginLeft: "max(-350px, -44vw)", marginTop: "max(-350px, -44vw)",
            background: `radial-gradient(circle closest-side, ${ringColor}38 0%, ${ringColor}0d 45%, transparent 70%)`,
            willChange: "transform, opacity",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Brand orange accent — top left */}
        <div
          className="absolute"
          style={{
            left: "-8%", top: "-10%",
            width: "max(500px, 52vw)", height: "max(500px, 52vw)",
            background: "radial-gradient(circle closest-side, hsla(217, 91%, 55%, 0.13) 0%, transparent 70%)",
          }}
        />

        {/* Subtle star field — orange + white, sparser than quiz (fireworks take the stage) */}
        {Array.from({ length: 22 }, (_, i) => ({
          left:  `${(i * 61 + 7) % 95}%`,
          top:   `${(i * 43 + 5) % 93}%`,
          size:  0.9 + (i % 3) * 0.6,
          delay: (i * 0.37) % 8,
          dur:   2.8 + (i % 5) * 0.8,
          tint:  i % 3 === 0 ? "hsla(217, 91%, 70%, 0.9)" : "hsla(0, 0%, 100%, 0.85)",
        })).map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: s.left, top: s.top,
              width: s.size, height: s.size,
              background: s.tint,
              boxShadow: `0 0 ${s.size * 3}px ${s.tint}`,
              willChange: "opacity, transform",
            }}
            animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.6, 1.2, 0.6] }}
            transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        {/* Edge vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 95% 90% at 50% 50%, transparent 35%, hsla(230, 65%, 6%, 0.70) 100%)",
          }}
        />

        {/* Grain */}
        <svg aria-hidden className="absolute inset-0 h-full w-full opacity-[0.025]">
          <filter id="mr-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#mr-grain)" />
        </svg>
      </div>

      {/* Firework bursts — staggered so only 1–2 are visible at any moment */}
      {tier !== "low" && (
        <div className="pointer-events-none absolute inset-0">
          {BURST_POSITIONS.slice(0, tier === "high" ? 12 : 7).map((cfg) => (
            <FireworkBurst key={`${cfg.bx}-${cfg.by}`} {...cfg} colors={confettiColors} />
          ))}
        </div>
      )}

      {/* ── Change-email modal ────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showChangeModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="mx-6 w-full max-w-xs rounded-2xl border border-border bg-card p-6 shadow-2xl"
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              {!pinVerified ? (
                <>
                  <p className="mb-1 text-center text-sm font-bold text-foreground">{t.changeEmail.accessTitle}</p>
                  <p className="mb-5 text-center text-xs text-muted-foreground">
                    {t.changeEmail.pinPrompt}
                  </p>

                  {/* Locked banner */}
                  <AnimatePresence>
                    {pinLockedSeconds > 0 && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                        {t.changeEmail.tooManyAttempts(pinLockedSeconds)}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* PIN dots */}
                  <div className="mb-4 flex justify-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className={`h-3 w-3 rounded-full transition-all ${
                          i < pinValue.length
                            ? pinError ? "bg-destructive" : "bg-primary"
                            : "bg-border"
                        }`}
                        animate={pinError ? { x: [0, -4, 4, -3, 3, 0] } : {}}
                        transition={{ duration: 0.4 }}
                      />
                    ))}
                  </div>
                  {pinVerifying && (
                    <p className="mb-2 text-center text-xs text-muted-foreground animate-pulse">{t.changeEmail.verifying}</p>
                  )}
                  {pinError && (
                    <p className="mb-3 text-center text-xs font-medium text-destructive">{t.changeEmail.pinError}</p>
                  )}

                  {/* Keypad — kiosk-friendly tap targets (≥64px) */}
                  <div className={`grid grid-cols-3 gap-2.5 ${pinVerifying || pinLockedSeconds > 0 ? "pointer-events-none opacity-40" : ""}`}>
                    {PIN_KEYS.map((key, i) => (
                      <button
                        key={i}
                        disabled={key === ""}
                        onClick={() => key !== "" && handlePinKey(key as number | "⌫")}
                        className={`min-h-[64px] rounded-xl py-4 text-xl font-bold transition-all active:scale-95 ${
                          key === "" ? "invisible" :
                          key === "⌫" ? "bg-secondary/60 text-muted-foreground hover:bg-secondary" :
                          "bg-secondary text-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={closeModal}
                    className="mt-4 w-full text-center text-xs text-muted-foreground/60 active:opacity-70"
                  >
                    {t.changeEmail.cancel}
                  </button>
                </>
              ) : (
                <>
                  <p className="mb-1 text-center text-sm font-bold text-foreground">{t.changeEmail.editTitle}</p>
                  <p className="mb-1 text-center text-xs text-muted-foreground">{t.changeEmail.currentEmail}</p>
                  <p className="mb-5 truncate text-center text-xs font-semibold text-foreground">
                    {userEmail}
                  </p>

                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
                    placeholder={t.changeEmail.newEmailPlaceholder}
                    autoFocus
                    className={`w-full rounded-xl border bg-background px-4 py-3 text-center text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary ${
                      newEmailTouched && !EMAIL_REGEX.test(newEmail.trim())
                        ? "border-destructive focus:ring-destructive"
                        : "border-border"
                    }`}
                  />
                  {newEmailTouched && !EMAIL_REGEX.test(newEmail.trim()) && (
                    <p className="mt-1 text-center text-xs text-destructive">{t.changeEmail.emailInvalid}</p>
                  )}

                  <button
                    onClick={handleSaveEmail}
                    className="mt-4 w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground active:scale-95 active:opacity-90"
                  >
                    {t.changeEmail.save}
                  </button>
                  <button
                    onClick={closeModal}
                    className="mt-2 w-full text-center text-xs text-muted-foreground/60 active:opacity-70"
                  >
                    {t.changeEmail.cancel}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="relative z-10 flex w-full max-w-md flex-col items-center gap-5"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Personalised greeting */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <p className="text-base text-muted-foreground">{t.result.gadgetIntro(userName)}</p>
        </motion.div>

        {/* Circular ring */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, stiffness: 180, damping: 22 }}
        >
          {!isScanning && (
            <motion.div
              className="absolute rounded-full"
              style={{ width: 168, height: 168, background: `radial-gradient(circle, ${ringColor}22 0%, transparent 70%)` }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <svg width="160" height="160" viewBox="0 0 120 120" style={{ overflow: "visible" }}>
            <circle cx="60" cy="60" r="56" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" opacity="0.25" />
            <motion.circle
              cx="60" cy="60" r="56" fill="none"
              stroke={ringColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 60 60)"
              style={{ filter: `drop-shadow(0 0 8px ${ringColor}60)` }}
            />
            {!isScanning && (
              <motion.circle cx="60" cy="60" r="56" fill="none"
                stroke={ringColor} strokeWidth="2"
                animate={{ r: [56, 59, 56], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className={`text-5xl font-bold tabular-nums leading-none ${isScanning ? "text-muted-foreground" : "text-gradient"}`}>
              {displayPercent}%
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isScanning ? t.result.scanning : t.result.match}
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-2xl font-bold tracking-wide text-foreground">{t.result.perfectMatch}</h2>
        </motion.div>

        {/* Product card */}
        <motion.div
          className="gradient-card shadow-card w-full overflow-hidden rounded-3xl border border-border"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5, ease: "easeOut" }}
        >
          <div className="relative flex h-52 items-center justify-center bg-secondary/50 overflow-hidden">
            {product.image && !imgError ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <span className="text-6xl">📦</span>
                <span className="text-xs font-medium">{t.result.productImageAlt}</span>
              </div>
            )}
            {!isScanning && (
              <motion.div
                className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${badgeBg}`}
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
              >
                {displayPercent}% {t.result.match}
              </motion.div>
            )}
          </div>

          <div className="p-5">
            <h3 className="text-xl font-bold leading-snug text-foreground">{product.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-2xl font-bold text-gradient">{product.price}</span>
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24"
                    fill={i < starCount ? "#22d3ee" : "none"}
                    stroke={i < starCount ? "#22d3ee" : "hsl(var(--muted-foreground))"}
                    strokeWidth="1.5">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                  </svg>
                ))}
                <span className="ml-1 text-xs text-muted-foreground">{product.rating}</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Benefits strip */}
        <motion.div
          className="flex w-full gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {[
            { icon: "🎥", label: t.result.video },
            { icon: "📖", label: t.result.manual },
            { icon: "💰", label: t.result.discount },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3 ${
                i === 2
                  ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border bg-card/80"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-[10px] font-semibold ${i === 2 ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ── Email reminder (5-tap secret) ───────────────────────────────────────────────────── */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          onClick={handleEmailTap}
        >
          <div
            className="w-full cursor-default select-none rounded-2xl px-4 py-3.5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)/0.6) 100%)",
              border: "1px solid hsl(var(--primary)/0.25)",
              boxShadow: "0 0 0 1px hsl(var(--primary)/0.08) inset, 0 2px 12px hsl(var(--primary)/0.06)",
            }}
          >
            {/* Subtle glow accent */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />

            <div className="flex items-center gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ background: "hsl(var(--primary)/0.12)", border: "1px solid hsl(var(--primary)/0.2)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-widest mb-0.5"
                  style={{ color: "hsl(var(--primary)/0.7)" }}>
                  {t.result.sendTo}
                </p>
                <p className="text-sm font-bold text-foreground truncate">{userEmail}</p>
              </div>

              {/* Check badge */}
              <div className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: "hsl(142,76%,36%/0.15)", border: "1px solid hsl(142,76%,36%/0.3)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="hsl(142,76%,50%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>

          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/65 leading-relaxed">
            {t.changeEmail.emailHint}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={handleClaim}
          disabled={claiming || !isOnline}
          aria-busy={claiming}
          aria-label={t.result.cta}
          className="gradient-primary shadow-glow flex w-full items-center justify-center rounded-2xl px-8 py-5 text-xl font-bold text-primary-foreground active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          whileTap={{ scale: claiming ? 1 : 0.97 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.4 }}
        >
          {claiming ? (
            <span
              className="h-6 w-6 animate-spin rounded-full border-[3px] border-primary-foreground/40 border-t-primary-foreground"
              aria-hidden="true"
            />
          ) : (
            t.result.cta
          )}
        </motion.button>

        {/* Claim error feedback — local validation OR backend error */}
        <AnimatePresence>
          {(claimError || localClaimError) && (
            <motion.p
              className="text-center text-xs font-medium text-destructive"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              {localClaimError === "offline"        ? t.welcome.offlineBanner
              : localClaimError === "invalid_email" ? t.changeEmail.emailInvalid
              : t.changeEmail.connectionError}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.p
          className="text-center text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.9 }}
        >
          {t.result.emailSubtitle}
        </motion.p>
      </motion.div>
    </div>
  );
};

export default MatchResult;
