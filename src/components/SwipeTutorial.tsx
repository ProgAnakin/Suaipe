import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";

const SwipeTutorial = ({ onDismiss }: { onDismiss: () => void }) => {
  const { t } = useLang();
  const [step, setStep] = useState<"no" | "yes">("no");

  // Loop "no" → "yes" → "no" indefinitely until user clicks button
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s === "no" ? "yes" : "no"));
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t.tutorial.ready}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
    >
      {/* Blurred dark overlay */}
      <div className="absolute inset-0 bg-background/82 backdrop-blur-md" />

      <div className="relative z-10 flex flex-col items-center gap-7 px-6">
            {/* Header */}
            <motion.p
              className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {t.tutorial.header}
            </motion.p>

            {/* Swipe demo row */}
            <div className="flex w-full max-w-sm items-center justify-between gap-3">

              {/* NO side */}
              <motion.div
                className="flex flex-col items-center gap-2"
                animate={{ opacity: step === "no" ? 1 : 0.22, scale: step === "no" ? 1.05 : 0.95 }}
                transition={{ duration: 0.35 }}
              >
                <motion.div
                  className="flex items-center gap-2 rounded-2xl border-2 border-destructive/60 bg-destructive/15 px-5 py-3"
                  animate={step === "no" ? { boxShadow: ["0 0 0px hsl(0 84% 60% / 0)", "0 0 24px hsl(0 84% 60% / 0.4)", "0 0 0px hsl(0 84% 60% / 0)"] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <span className="text-2xl font-black text-destructive">✕</span>
                  <span className="text-2xl font-black text-destructive">{t.swipe.no}</span>
                </motion.div>
                <motion.span
                  className="text-4xl"
                  animate={step === "no" ? { x: [0, -10, 0] } : {}}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  ←
                </motion.span>
              </motion.div>

              {/* Demo card */}
              <div className="relative flex h-48 w-40 items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="gradient-card shadow-card absolute flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-3xl border border-border/80"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: [1, 1, 0],
                      x:      step === "no"  ? [0, -160] : [0,  160],
                      rotate: step === "no"  ? [0,  -22] : [0,   22],
                    }}
                    exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.15 } }}
                    transition={{
                      scale:   { type: "spring", stiffness: 380, damping: 36 },
                      opacity: { duration: 1.6, times: [0, 0.55, 1], ease: "easeInOut" },
                      x:       { duration: 1.6, ease: [0.36, 0, 0.66, 0] },
                      rotate:  { duration: 1.6, ease: [0.36, 0, 0.66, 0] },
                    }}
                  >
                    {/* Top accent bar */}
                    <div className="h-1.5 w-full flex-shrink-0 gradient-primary" />
                    <span className="mt-2 text-6xl">🤔</span>
                    <span className="pb-4 text-sm font-semibold text-muted-foreground">
                      {step === "no" ? t.swipe.no : t.swipe.yes}?
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* YES side */}
              <motion.div
                className="flex flex-col items-center gap-2"
                animate={{ opacity: step === "yes" ? 1 : 0.22, scale: step === "yes" ? 1.05 : 0.95 }}
                transition={{ duration: 0.35 }}
              >
                <motion.div
                  className="flex items-center gap-2 rounded-2xl border-2 border-success/60 bg-success/15 px-5 py-3"
                  animate={step === "yes" ? { boxShadow: ["0 0 0px hsl(168 76% 42% / 0)", "0 0 24px hsl(168 76% 42% / 0.4)", "0 0 0px hsl(168 76% 42% / 0)"] } : {}}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  <span className="text-2xl font-black text-success">{t.swipe.yes}</span>
                  <span className="text-2xl font-black text-success">✓</span>
                </motion.div>
                <motion.span
                  className="text-4xl"
                  animate={step === "yes" ? { x: [0, 10, 0] } : {}}
                  transition={{ duration: 0.7, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.div>
            </div>

            {/* Step label */}
            <AnimatePresence mode="wait">
              <motion.p
                key={step}
                className="text-base font-bold text-foreground/80"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                {step === "no" ? t.tutorial.no : t.tutorial.yes}
              </motion.p>
            </AnimatePresence>

            {/* CTA button */}
            <motion.button
              data-testid="dismiss-swipe-tutorial"
              onClick={onDismiss}
              className="gradient-primary shadow-glow rounded-2xl px-10 py-3.5 text-base font-bold text-primary-foreground active:scale-95"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileTap={{ scale: 0.96 }}
            >
              {t.tutorial.ready}
            </motion.button>
      </div>
    </motion.div>
  );
};

export default SwipeTutorial;
