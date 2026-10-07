import { Config } from "@remotion/cli/config";

// PNG frames keep text and UI edges crisp (the default JPEG softens them).
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);

// @remotion/effects (light leaks, glow, grain, chromatic aberration) run on WebGL2.
Config.setChromiumOpenGlRenderer("angle");

// Remotion normally downloads its own Chrome Headless Shell on first render. In containers and CI that
// download is often blocked, so an installed browser can be supplied instead, e.g.
//   REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
