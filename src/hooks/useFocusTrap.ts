import { useEffect, useRef, type RefObject } from "react";

/**
 * Accessible modal helper: while `enabled`, focuses the first focusable element
 * inside `containerRef`, keeps Tab focus cycling within it, and calls `onEscape`
 * on the Escape key. Mirrors the inline pattern the manager modals already use
 * (StoreSelectorModal / FaqModal) so the kiosk PIN dialogs behave the same.
 *
 * `onEscape` is read through a ref, so passing an inline arrow won't re-run the
 * effect (no focus-stealing on every render) — the effect only re-runs when
 * `enabled` flips, i.e. when the dialog actually opens/closes.
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T>,
  onEscape?: () => void,
  enabled = true,
) {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    const focusables = () =>
      el.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );

    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        escapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [containerRef, enabled]);
}
