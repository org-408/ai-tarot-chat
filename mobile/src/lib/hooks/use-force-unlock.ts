import { useCallback, useRef, useState } from "react";

interface UseForceLongPressOptions {
  delayMs?: number;
  enabled?: boolean;
}

interface UseForceLongPressReturn {
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: () => void;
    onPointerLeave: () => void;
    onPointerCancel: () => void;
  };
  progress: number;
  isHolding: boolean;
}

/**
 * ロック中メニューの強制アンロック用ロングプレスフック。
 * `enabled=false` のときはすべて no-op で、通常の操作に一切干渉しない。
 * `delayMs` 間押し続けると `onTrigger` が一度だけ呼ばれる。
 * delayMs はデフォルト 3000ms。
 */
export function useForceLongPress(
  onTrigger: () => void,
  options: UseForceLongPressOptions = {},
): UseForceLongPressReturn {
  const { delayMs = 3000, enabled = true } = options;

  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const cancel = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    startTimeRef.current = null;
    triggeredRef.current = false;
    setProgress(0);
    setIsHolding(false);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      e.preventDefault();
      triggeredRef.current = false;
      startTimeRef.current = performance.now();
      setIsHolding(true);

      const tick = (now: number) => {
        if (startTimeRef.current === null) return;
        const elapsed = now - startTimeRef.current;
        const p = Math.min(elapsed / delayMs, 1);
        setProgress(p);

        if (p >= 1) {
          if (!triggeredRef.current) {
            triggeredRef.current = true;
            cancel();
            onTrigger();
          }
          return;
        }
        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    },
    [enabled, delayMs, cancel, onTrigger],
  );

  const noopHandlers = {
    onPointerDown: () => {},
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };

  if (!enabled) {
    return { handlers: noopHandlers, progress: 0, isHolding: false };
  }

  return {
    handlers: {
      onPointerDown,
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
    },
    progress,
    isHolding,
  };
}
