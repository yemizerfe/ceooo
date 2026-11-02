"use client";
// hooks/useSearchHotkey.ts
//
// The navbars advertise "Quick search ⌘K", so the shortcut has to actually
// work: ⌘K / Ctrl+K toggles the search palette, "/" opens it when the visitor
// is not typing, and Escape closes it. Without this the hint was decoration
// and the only way in was clicking the button.

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function useSearchHotkey({
  isOpen,
  open,
  close,
}: {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const commandK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (commandK) {
        event.preventDefault();
        if (isOpen) close();
        else open();
        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
        return;
      }

      // A bare "/" is the other shortcut people expect. Never steal it from a
      // field the visitor is already typing in.
      if (event.key === "/" && !isOpen && !isTypingTarget(event.target)) {
        event.preventDefault();
        open();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open, close]);
}
