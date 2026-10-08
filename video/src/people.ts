import { staticFile } from "remotion";
import type { Quad } from "./lib/homography";

/**
 * The AI-generated "human" photographs (hands only — no faces): see tools/people/manifest.json for prompts and models.
 * Coordinates are in PHOTO pixels (the files are 960x1280). `quad` = the tablet's glass, TL → TR → BR → BL, which is
 * where the kiosk UI is composited (measured from the photo — re-measure if a photo is regenerated).
 */
export type PhotoSpec = { src: string; w: number; h: number };

export const PHOTO = {
  handoff: { src: staticFile("people/handoff.webp"), w: 960, h: 1280 } as PhotoSpec,
  bag: { src: staticFile("people/bag.webp"), w: 960, h: 1280 } as PhotoSpec,
  handshake: { src: staticFile("people/handshake.webp"), w: 960, h: 1280 } as PhotoSpec,
  store: { src: staticFile("people/store.webp"), w: 960, h: 1280 } as PhotoSpec,
} as const;

/** The fingers that cover the glass, cut out of the hand-off photo (RGBA) — drawn above the lit screen. Made by tools/people/measure_quad.py --fg. */
export const HANDOFF_FG = staticFile("people/handoff-fg.webp");

/**
 * The glass of the tablet in the hand-off photo (photo px, TL → TR → BR → BL), inset 2.5 % so the lit UI keeps a thin black
 * border. Measured with `python3 tools/people/measure_quad.py public/people/handoff.webp` — re-run it if the image changes.
 */
export const HANDOFF_QUAD: Quad = [
  [228, 231],
  [649, 216],
  [702, 819],
  [268, 849],
];
