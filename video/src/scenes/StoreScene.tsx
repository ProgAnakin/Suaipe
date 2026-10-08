import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS, FONT } from "../theme";

/** Store value (placeholder until the captures of /manager and /stats are in): what the manager gets. */
export const StoreScene: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 600, fontSize: 34, color: COLORS.textDim, letterSpacing: "0.1em" }}>
    STORE VALUE
  </AbsoluteFill>
);
