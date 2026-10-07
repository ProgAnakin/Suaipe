import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/fonts";

// Smoke test: proves that fonts and images load from /public (so renders work offline) and that
// animation is a pure function of the frame. Replace with real compositions.
// loadFont() blocks the render until the font is ready.
loadFont({
  family: "Space Grotesk",
  url: staticFile("fonts/space-grotesk-700.woff2"),
  weight: "700",
}).catch((err) => console.error("Space Grotesk failed to load", err));

export const SmokeTest = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const word = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d1228",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Space Grotesk, sans-serif",
        color: "#f0f4ff",
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{ width: 240, height: 240, transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}
      />
      <div
        style={{
          marginTop: 40,
          fontSize: 130,
          fontWeight: 700,
          letterSpacing: `${0.55 - 0.41 * word}em`,
          opacity: word,
          background: "linear-gradient(95deg,#3b82f6,#22d3ee)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        SUAIPE
      </div>
      <div style={{ marginTop: 28, fontSize: 40, color: "#8fa2cf" }}>Remotion smoke test · frame {frame}</div>
    </AbsoluteFill>
  );
};
