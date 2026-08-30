"use client";

import { useEffect } from "react";

export function useClickOutside(
  refs: React.RefObject<HTMLElement | null> | React.RefObject<HTMLElement | null>[],
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const refList = Array.isArray(refs) ? refs : [refs];
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      const inside = refList.some((ref) => ref.current?.contains(target));
      if (!inside) onOutside();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [refs, onOutside, enabled]);
}
