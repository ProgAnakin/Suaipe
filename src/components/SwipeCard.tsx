import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import type { QuizCard } from "@/data/quiz-cards";
import { resolveCardText } from "@/data/quiz-cards";
import { useLang } from "@/i18n/LanguageContext";
import { haptic } from "@/lib/haptic";

interface SwipeCardProps {
  card: QuizCard;
  totalCards: number;
  onSwipe: (direction: "left" | "right") => void;
  exitDirection?: "left" | "right";
  index?: number;
}

const SwipeCard = ({ card, totalCards, onSwipe, exitDirection, index = 0 }: SwipeCardProps) => {
  const { t, lang } = useLang();

  const x = useMotionValue(0);
  const rotate       = useTransform(x, [-200, 200], [-18, 18]);
  const noOpacity    = useTransform(x, [-160, -50, 0], [1, 0.3, 0]);
  const yesOpacity   = useTransform(x, [0, 50, 160], [0, 0.3, 1]);
  const noTintOp     = useTransform(x, [-140, -40, 0], [0.22, 0.06, 0]);
  const yesTintOp    = useTransform(x, [0, 40, 140], [0, 0.06, 0.22]);
  const cardShadow   = useTransform(x, [-160, 0, 160], [
    "0 28px 80px hsl(0 84% 60% / 0.50), 0 0 0 1px rgba(255,255,255,0.05) inset",
    "0 28px 90px hsl(228 65% 4% / 0.70), 0 0 0 1px rgba(255,255,255,0.06) inset",
    "0 28px 80px hsl(168 76% 42% / 0.50), 0 0 0 1px rgba(255,255,255,0.05) inset",
  ]);

  const categoryLabel = t.categories[card.tag] ?? card.tag;
  const stepNum   = String(index + 1).padStart(2, "0");
  const stepTotal = String(totalCards).padStart(2, "0");
  const displayText = resolveCardText(card, lang);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const boost = Math.abs(info.velocity.x) > 400 ? 30 : 0;
    const threshold = 85 - boost;
    if      (info.offset.x >  threshold) { haptic(45); onSwipe("right"); }
    else if (info.offset.x < -threshold) { haptic(30); onSwipe("left");  }
  };

  const cardBg     = "linear-gradient(158deg, hsl(228,52%,20%) 0%, hsl(228,68%,11%) 100%)";
  const cardBorder = "1px solid rgba(255,255,255,0.09)";

  return (
    <div className="relative flex h-[600px] w-full max-w-[360px] items-center justify-center">

      {/* Ghost stack — two cards peeking below */}
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{
          background: cardBg, border: cardBorder,
          transform: "scale(0.84) translateY(42px)",
          opacity: 0.13, zIndex: -1,
        }}
      />
      <div
        className="absolute inset-0 rounded-[28px]"
        style={{
          background: cardBg, border: cardBorder,
          transform: "scale(0.92) translateY(20px)",
          opacity: 0.36, zIndex: 0,
        }}
      />

      {/* NO / YES drag stamps */}
      <motion.div
        className="pointer-events-none absolute left-4 top-10 z-20 flex items-center gap-2 rounded-2xl border-[2.5px] border-destructive/80 bg-destructive/15 px-4 py-2 backdrop-blur-sm"
        style={{ opacity: noOpacity, rotate: -12 }}
      >
        <span className="text-xl font-black text-destructive">✕</span>
        <span className="text-xl font-black tracking-wide text-destructive">{t.swipe.no}</span>
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-4 top-10 z-20 flex items-center gap-2 rounded-2xl border-[2.5px] border-success/80 bg-success/15 px-4 py-2 backdrop-blur-sm"
        style={{ opacity: yesOpacity, rotate: 12 }}
      >
        <span className="text-xl font-black tracking-wide text-success">{t.swipe.yes}</span>
        <span className="text-xl font-black text-success">✓</span>
      </motion.div>

      {/* ── CARD ── */}
      <motion.div
        className="absolute flex h-full w-full cursor-grab flex-col overflow-hidden rounded-[28px] active:cursor-grabbing"
        style={{ x, rotate, boxShadow: cardShadow, zIndex: 1, background: cardBg, border: cardBorder }}
        role="group"
        aria-roledescription="quiz card"
        aria-label={displayText}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.55}
        dragTransition={{ bounceStiffness: 200, bounceDamping: 28 }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
        exit={{
          x: exitDirection === "right" ? 480 : -480,
          rotate: exitDirection === "right" ? 18 : -18,
          opacity: 0,
          transition: { duration: 0.26, ease: [0.32, 0, 0.67, 0] },
        }}
        whileDrag={{ scale: 1.015 }}
      >
        {/* brand orange bar */}
        <div
          className="flex-shrink-0"
          style={{
            height: 4,
            background: "linear-gradient(90deg, hsl(217, 91%,55%) 0%, hsl(188, 86%,50%) 100%)",
          }}
        />

        {/* Drag tint overlays */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{ background: "hsl(0 84% 60%)", opacity: noTintOp, zIndex: 25 }}
        />
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{ background: "hsl(168 76% 42%)", opacity: yesTintOp, zIndex: 25 }}
        />

        {/* Warm glow beneath orange bar */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: 100,
            background: "linear-gradient(to bottom, hsla(217, 91%,55%,0.11) 0%, transparent 100%)",
          }}
        />

        {/* Bottom gradient */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: 200,
            zIndex: 10,
            background: "linear-gradient(to top, hsla(228,65%,7%,0.88) 0%, transparent 100%)",
          }}
        />

        {/* ── Card content ── */}
        <div className="relative z-20 flex flex-1 flex-col">

          {/* Header row: category • step counter */}
          <div className="flex items-center justify-between px-6 pt-5">
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: "hsl(217, 91%,58%)", opacity: 0.85 }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.26em]"
                style={{ color: "hsla(188, 86%,72%,0.82)" }}
              >
                {categoryLabel}
              </span>
            </div>
            <span
              className="tabular-nums text-[11px] font-semibold"
              style={{ color: "hsla(188, 86%,72%,0.60)" }}
            >
              {stepNum}
              <span style={{ opacity: 0.5 }}>&thinsp;/&thinsp;{stepTotal}</span>
            </span>
          </div>

          {/* Thin divider */}
          <div
            className="mx-6 mt-3"
            style={{
              height: 1,
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
            }}
          />

          {/* Emoji — or a custom image when the card has one */}
          <div className="flex flex-1 items-center justify-center px-6">
            {card.image_url ? (
              <img
                src={card.image_url}
                alt=""
                draggable={false}
                className="select-none object-contain"
                style={{ maxHeight: 168, maxWidth: "82%" }}
              />
            ) : (
              <span
                className="select-none"
                style={{ display: "block", fontSize: 116, lineHeight: 1 }}
              >
                {card.emoji}
              </span>
            )}
          </div>

          {/* Thin divider */}
          <div
            className="mx-6"
            style={{
              height: 1,
              background: "linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)",
            }}
          />

          {/* Question text */}
          <div className="relative z-20 px-7 pb-9 pt-5 text-center">
            <h2
              className="text-[1.12rem] font-bold leading-snug text-white"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}
            >
              {displayText}
            </h2>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SwipeCard;
