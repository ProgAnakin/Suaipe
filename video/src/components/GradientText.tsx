import React from "react";
import { GRADIENT } from "../theme";

export const GradientText: React.FC<{ children: React.ReactNode; gradient?: string; style?: React.CSSProperties }> = ({
  children,
  gradient = GRADIENT,
  style,
}) => (
  <span
    style={{
      background: gradient,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
      ...style,
    }}
  >
    {children}
  </span>
);
