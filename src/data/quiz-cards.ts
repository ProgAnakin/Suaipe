import type { Question } from "@/data/questions";

// The quiz is a fixed 8-swipe experience: 8 questions → the 8 matching tags in
// products.ts. Managers may author MORE cards (e.g. seasonal variants) but only
// this many can be ACTIVE/exposed at once — both the kiosk and the manager UI
// enforce the cap so the swipe count and the tag map stay consistent.
export const MAX_ACTIVE_QUIZ_CARDS = 8;

export interface QuizCard {
  id: number;
  emoji: string;
  /** Optional custom image shown in place of the emoji (null → emoji is used). */
  image_url: string | null;
  tag: string;
  sort_order: number;
  active: boolean;
  text_it: string;
  text_en: string | null;
  text_pt: string | null;
  text_es: string | null;
  text_fr: string | null;
}

/** Returns the best available text for a card given the current language. */
export function resolveCardText(card: QuizCard, lang: string): string {
  const key = `text_${lang}` as keyof QuizCard;
  const val = card[key];
  return (typeof val === "string" && val.trim()) ? val : card.text_it;
}

/** Converts the static questions.ts array into QuizCard objects (fallback). */
export function questionsToCards(questions: Question[]): QuizCard[] {
  return questions.map((q) => ({
    id: q.id,
    emoji: q.emoji,
    image_url: null,
    tag: q.category,
    sort_order: q.id,
    active: true,
    text_it: q.text,
    text_en: null,
    text_pt: null,
    text_es: null,
    text_fr: null,
  }));
}

/** Builds a tagMap (questionId → tag) from a list of cards. */
export function buildTagMap(cards: QuizCard[]): Record<number, string> {
  const map: Record<number, string> = {};
  cards.forEach((c) => { map[c.id] = c.tag; });
  return map;
}
