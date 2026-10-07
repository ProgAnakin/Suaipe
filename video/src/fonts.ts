import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Fonts live in public/fonts so renders work offline. loadFont() holds the render until each file is ready.
const grotesk = [400, 500, 600, 700] as const;
const plex = [400, 500, 600] as const;

for (const w of grotesk) {
  loadFont({
    family: "Space Grotesk",
    url: staticFile(`fonts/space-grotesk-${w}.woff2`),
    weight: String(w),
  }).catch((err) => console.error(`Space Grotesk ${w} failed to load`, err));
}
for (const w of plex) {
  loadFont({
    family: "IBM Plex Mono",
    url: staticFile(`fonts/ibm-plex-mono-${w}.woff2`),
    weight: String(w),
  }).catch((err) => console.error(`IBM Plex Mono ${w} failed to load`, err));
}
