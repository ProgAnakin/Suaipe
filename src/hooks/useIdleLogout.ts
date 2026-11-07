import { useEffect, useRef } from "react";
import { lockStaffSession } from "@/lib/staffLogout";
import { ADMIN_IDLE_TIMEOUT_MS } from "@/config/timings";

const IDLE_EVENTS = ["mousedown", "touchstart", "keydown", "scroll"] as const;

/**
 * Signs the user out of Supabase and calls `onLogout` after
 * ADMIN_IDLE_TIMEOUT_MS of inactivity (no mouse, touch, keyboard or scroll).
 */
export function useIdleLogout(onLogout: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => lockStaffSession(onLogout), ADMIN_IDLE_TIMEOUT_MS);
    };

    reset();
    IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [onLogout]);
}
