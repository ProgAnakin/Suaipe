import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AttractBackground } from "./AttractBackground";
import { SuaipeLogo } from "./SuaipeLogo";
import { useLang } from "@/i18n/LanguageContext";
import { LANGUAGES } from "@/i18n/translations";

const MSG_EMOJIS = ["🎯", "🎁", "💡", "✨"];

// ── Language picker modal ────────────────────────────────────────────────────────────────────────────────
const LanguageModal = ({ onClose }: { onClose: () => void }) => {
  const { lang, setLang } = useLang();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="mx-6 w-full max-w-sm rounded-3xl p-7"
        style={{
          background: "linear-gradient(160deg, hsl(225,50%,12%) 0%, hsl(225,40%,9%) 100%)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}
        initial={{ scale: 0.88, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.88, y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-white/40">
          🌍 Lingua / Language
        </p>
        <div className="flex flex-col gap-3">
          {LANGUAGES.map(({ code, flag, name }) => {
            const active = lang === code;
            return (
              <button
                key={code}
                onClick={() => { setLang(code); setTimeout(onClose, 220); }}
                aria-label={`Select ${name} language`}
                aria-pressed={active}
                className="flex items-center gap-4 rounded-2xl px-5 py-3.5 transition-all duration-200 active:scale-95"
                style={active ? {
                  background: "linear-gradient(135deg, hsl(217, 91%,55%), hsl(188, 86%,48%))",
                  boxShadow: "0 0 24px hsla(217, 91%,55%,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                } : {
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span className="text-3xl leading-none">{flag}</span>
                <span className={`flex-1 text-left text-base font-bold ${active ? "text-white" : "text-white/70"}`}>
                  {name}
                </span>
                {active && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main attract screen ─────────────────────────────────────────────────────────────────────────────────
interface AttractScreenProps {
  onComplete: () => void;
}

const AttractScreen = ({ onComplete }: AttractScreenProps) => {
  const { t, lang } = useLang();
  const [msgIndex, setMsgIndex] = useState(0);
  const [showLangModal, setShowLangModal] = useState(false);

  const messages = [
    { emoji: MSG_EMOJIS[0], text: t.splash.step1 },
    { emoji: MSG_EMOJIS[1], text: t.splash.step2 },
    { emoji: MSG_EMOJIS[2], text: t.splash.step3 },
    { emoji: MSG_EMOJIS[3], text: t.splash.step4 },
  ];

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % messages.length), 2500);
    return () => clearInterval(id);
  // Mount-only: rotates the attract messages on a fixed 2.5 s cadence.
  // `messages` is module-scope and stable across renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <div
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden"
      style={{ background: "hsl(225,60%,7%)" }}
    >
      <AttractBackground />

      <AnimatePresence>
        {showLangModal && <LanguageModal onClose={() => setShowLangModal(false)} />}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">

        {/* Logo — brand mark with glow halo */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.65, y: -24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{
            position: "absolute", inset: "-45%",
            background: "radial-gradient(circle, hsla(217, 91%,55%,0.65) 0%, transparent 70%)",
            filter: "blur(28px)",
            borderRadius: "50%",
          }} />
          <div
            className="relative"
            style={{ animation: "at-logo-glow 3s ease-in-out infinite" }}
          >
            <SuaipeLogo size={112} />
          </div>
        </motion.div>

        {/* SUAIPE — single-word brand mark with a spring-in entrance */}
        <motion.h1
          className="leading-none font-black uppercase"
          style={{ fontSize: "clamp(4rem,13vw,6rem)", letterSpacing: "0.09em" }}
        >
          <motion.span
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(188, 86%, 53%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            initial={{ opacity: 0, y: -32, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.18, type: "spring", stiffness: 260, damping: 22 }}
          >SUAIPE</motion.span>
        </motion.h1>

        {/* Hook subheadline */}
        <motion.div
          className="space-y-0.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.48 }}
        >
          <p className="text-xl font-bold text-white/85">{t.splash.headline}</p>
          <p className="text-base font-semibold" style={{ color: "hsl(217, 91%,65%)" }}>
            {t.splash.sub} ✶
          </p>
        </motion.div>

        {/* Cycling message — spring bounce pop */}
        <div className="flex h-[72px] items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${msgIndex}-${lang}`}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.65, rotate: 6 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <span style={{ fontSize: 30, lineHeight: 1 }}>{messages[msgIndex].emoji}</span>
              <span className="text-base font-semibold text-white/85">
                {messages[msgIndex].text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Feature strip */}
        <motion.div
          className="flex items-center gap-3 text-xs font-semibold"
          style={{ color: "rgba(255,255,255,0.42)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.68, duration: 0.5 }}
        >
          <span>{t.attract.swipes}</span>
          <span style={{ color: "hsl(217, 91%,55%)", fontSize: 18, lineHeight: 1 }}>·</span>
          <span>{t.attract.minutes}</span>
          <span style={{ color: "hsl(217, 91%,55%)", fontSize: 18, lineHeight: 1 }}>·</span>
          <span style={{ color: "hsl(217, 91%,65%)" }}>{t.attract.perfect}</span>
        </motion.div>

        {/* CTA — breathing light glow */}
        <motion.div
          className="relative mt-1"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58, duration: 0.5 }}
        >
          {/* Soft halo behind the button that breathes */}
          <motion.div
            className="pointer-events-none absolute -inset-3 rounded-3xl"
            style={{ background: "radial-gradient(ellipse at 50% 60%, hsla(217, 91%,55%,0.45) 0%, transparent 72%)", filter: "blur(12px)" }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.button
            className="relative rounded-2xl px-14 py-4 text-lg font-black text-white uppercase tracking-wider"
            style={{
              background: "linear-gradient(135deg, hsl(217, 91%,58%), hsl(188, 86%,50%))",
              letterSpacing: "0.08em",
            }}
            animate={{
              boxShadow: [
                "0 0 28px hsla(217, 91%,55%,0.38), 0 8px 28px hsla(0,0%,0%,0.38)",
                "0 0 64px hsla(217, 91%,55%,0.80), 0 0 100px hsla(217, 91%,55%,0.22), 0 8px 28px hsla(0,0%,0%,0.38)",
                "0 0 28px hsla(217, 91%,55%,0.38), 0 8px 28px hsla(0,0%,0%,0.38)",
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.96 }}
            data-testid="start-quiz"
            onClick={onComplete}
          >
            {t.splash.tap}{" "}
            <span style={{ display: "inline-block", animation: "at-arrow-nudge 1s ease-in-out infinite" }}>
              →
            </span>
          </motion.button>
        </motion.div>

        {/* Language button */}
        <motion.button
          className="flex items-center gap-2.5 rounded-2xl px-6 py-3 transition-all duration-200 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.5 }}
          onClick={() => setShowLangModal(true)}
        >
          <span className="text-xl leading-none">{currentLang.flag}</span>
          <span className="text-sm font-semibold text-white/75">{t.splash.chooseLang}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="ml-0.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.button>
      </div>
    </div>
  );
};

export default AttractScreen;
