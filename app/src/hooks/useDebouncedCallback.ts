import { useCallback, useEffect, useRef } from "react";

// Returns [debounced, flush] — flush immediately fires (and cancels) any
// pending call, for callers that need to guarantee a trailing edit isn't
// lost when the caller is about to unmount or switch context.
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Args | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const debounced = useCallback(
    (...args: Args) => {
      clear();
      pendingArgsRef.current = args;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        pendingArgsRef.current = null;
        callbackRef.current(...args);
      }, delayMs);
    },
    [clear, delayMs],
  );

  const flush = useCallback(() => {
    if (!timeoutRef.current || !pendingArgsRef.current) return;
    const args = pendingArgsRef.current;
    clear();
    pendingArgsRef.current = null;
    callbackRef.current(...args);
  }, [clear]);

  return [debounced, flush] as const;
}
