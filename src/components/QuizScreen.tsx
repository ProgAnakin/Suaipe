import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import SwipeCard from "./SwipeCard";
import SwipeTutorial from "./SwipeTutorial";
import QuizBackground from "./QuizBackground";
import { questions } from "@/data/questions";
import type { QuizCard } from "@/data/quiz-cards";
import { questionsToCards } from "@/data/quiz-cards";
import { useSound } from "@/hooks/useSound";
import { useLang } from "@/i18n/LanguageContext";
import { haptic } from "@/lib/haptic";

interface QuizScreenProps {
  onComplete: (answers: Record<number, boolean>) => void;
  cards?: QuizCard[];
}

const QuizScreen = ({ onComplete, cards: cardsProp }: QuizScreenProps) => {
  const { t } = useLang();
  // Fall back to static questions when no DB cards are provided
  const cards = cardsProp && cardsProp.length > 0 ? cardsProp : questionsToCards(questions);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [showTutorial, setShowTutorial] = useState(true);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | undefined>(undefined);
  const [transitioning, setTransitioning] = useState(false);
  const transitioningRef = useRef(false);
  const { play } = useSound();

  const handleSwipe = useCallback((direction: "left" | "right") => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    setTransitioning(true);
    setExitDirection(direction);
    play(direction === "right" ? "swipe_yes" : "swipe_no");

    const card = cards[currentIndex];
    const newAnswers = { ...answers, [card.id]: direction === "right" };
    setAnswers(newAnswers);

    if (currentIndex + 1 >= cards.length) {
      setTimeout(() => {
        transitioningRef.current = false;
        setTransitioning(false);
        onComplete(newAnswers);
      }, 240);
    } else {
      setTimeout(() => {
        setExitDirection(undefined);
        setCurrentIndex((i) => i + 1);
        transitioningRef.current = false;
        setTransitioning(false);
      }, 240);
    }
  // `play` (from useSound) is a stable callback and intentionally omitted;
  // adding it would re-create handleSwipe on every render and reset the
  // ref-based transitioning guard above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, answers, cards, onComplete]);

  const card = cards[currentIndex];
  if (!card) return null;

  return (
    <div className="relative flex h-dvh flex-col items-center justify-center px-6">
      <QuizBackground />

      {showTutorial && <SwipeTutorial onDismiss={() => setShowTutorial(false)} />}

      {/* Progress */}
      <div className="absolute left-0 right-0 top-0 px-6 pt-8">
        <div className="mx-auto flex max-w-sm flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              {t.quiz.questionOf(currentIndex + 1, cards.length)}
            </span>
            <span className="text-sm font-bold text-primary">
              {Math.round((currentIndex / cards.length) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full gradient-primary"
              initial={{ width: `${(Math.max(0, currentIndex - 1) / cards.length) * 100}%` }}
              animate={{ width: `${(currentIndex / cards.length) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-center gap-1.5 pt-0.5">
            {cards.map((_, idx) => (
              <motion.div
                key={idx}
                className="rounded-full bg-primary"
                animate={{
                  width: idx === currentIndex ? 20 : 6,
                  height: 6,
                  opacity: idx <= currentIndex ? 1 : 0.3,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Card */}
      <AnimatePresence custom={exitDirection}>
        <SwipeCard
          key={currentIndex}
          card={card}
          totalCards={cards.length}
          onSwipe={handleSwipe}
          exitDirection={exitDirection}
          index={currentIndex}
        />
      </AnimatePresence>

      {/* Buttons */}
      <div
        className="absolute bottom-10 flex w-full max-w-sm items-center justify-center gap-4 px-5"
        style={{ pointerEvents: transitioning ? "none" : "auto", opacity: transitioning ? 0.4 : 1, transition: "opacity 0.15s" }}
      >
        {/* NO */}
        <motion.button
          onClick={() => { haptic(30); handleSwipe("left"); }}
          className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-destructive/55 bg-destructive/10 text-destructive backdrop-blur-sm"
          style={{ boxShadow: "0 0 20px hsl(0 84% 60% / 0.18), inset 0 0 10px hsl(0 84% 60% / 0.06)" }}
          whileTap={{ scale: 0.90, boxShadow: "0 0 52px hsl(0 84% 60% / 0.72), inset 0 0 20px hsl(0 84% 60% / 0.32)" }}
        >
          <ChevronsLeft className="h-6 w-6 flex-shrink-0" strokeWidth={2.5} />
          <span className="text-base font-black tracking-wide">{t.swipe.no}</span>
        </motion.button>

        {/* Center label */}
        <div className="flex w-14 shrink-0 flex-col items-center gap-1">
          <div className="h-px w-full bg-border/30" />
          <p className="text-center text-[7px] font-black uppercase leading-tight tracking-[0.14em] text-muted-foreground/65">
            {t.quiz.chooseDestiny}
          </p>
          <div className="h-px w-full bg-border/30" />
        </div>

        {/* YES */}
        <motion.button
          data-testid="quiz-yes"
          onClick={() => { haptic(45); handleSwipe("right"); }}
          className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-success/55 bg-success/10 text-success backdrop-blur-sm"
          style={{ boxShadow: "0 0 20px hsl(168 76% 42% / 0.18), inset 0 0 10px hsl(168 76% 42% / 0.06)" }}
          whileTap={{ scale: 0.90, boxShadow: "0 0 52px hsl(168 76% 42% / 0.72), inset 0 0 20px hsl(168 76% 42% / 0.32)" }}
        >
          <span className="text-base font-black tracking-wide">{t.swipe.yes}</span>
          <ChevronsRight className="h-6 w-6 flex-shrink-0" strokeWidth={2.5} />
        </motion.button>
      </div>
    </div>
  );
};

export default QuizScreen;
