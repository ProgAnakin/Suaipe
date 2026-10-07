import { staticFile } from "remotion";

// All captured / generated media lives under public/. Keep every path in one place.
// Folder with the captured app screens under public/. (Flipped to a temp folder only while testing without captures.)
const APP_ROOT = "app";

export const LOGO = staticFile("logo.png");
export const product = (id: string) => staticFile(`products/${id}.webp`);
export const still = (name: string) => staticFile(`${APP_ROOT}/still/${name}.webp`);
export const swipeFrame = (card: number, i: number) => staticFile(`${APP_ROOT}/swipe/swipe-${card}-${String(i).padStart(3, "0")}.webp`);
// the e-mail frames use the "calm" variant: same keystrokes, without the red "invalid" styling shown while the address is incomplete
export const typingFrame = (field: "first" | "last" | "email", i: number) =>
  staticFile(`${APP_ROOT}/typing/${field === "email" ? "email-calm" : field}-${String(i).padStart(2, "0")}.webp`);
export const SOUNDTRACK = staticFile("audio/soundtrack.wav");

export const PRODUCT_IDS = [
  "aurae-pulse-pro",
  "lunaring-halo",
  "vibewave-open",
  "pulsar-recover-x",
  "voltik-snapcell",
  "aeris-glow",
  "brevia-gopress",
  "echobox-riff",
  "nimbus-sip",
  "lumio-air",
] as const;
