import { useEffect, useRef } from 'react';

/**
 * Fetches immediately, then keeps polling on an interval as long as
 * `shouldContinue(data)` returns true for the latest fetched data.
 * `fetcher`/`onData`/`shouldContinue` are read from refs so identity churn
 * across renders doesn't restart the poll loop or duplicate in-flight requests.
 * Pass a changing `resetKey` (e.g. bump a counter after a manual retry action)
 * to force the loop to restart even if `intervalMs` is unchanged.
 */
export function usePollWhile<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  shouldContinue: (data: T) => boolean,
  intervalMs = 2000,
  resetKey?: unknown
): void {
  const fetcherRef = useRef(fetcher);
  const onDataRef = useRef(onData);
  const shouldContinueRef = useRef(shouldContinue);

  fetcherRef.current = fetcher;
  onDataRef.current = onData;
  shouldContinueRef.current = shouldContinue;

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const data = await fetcherRef.current();
        if (cancelled) return;
        onDataRef.current(data);
        if (shouldContinueRef.current(data)) {
          timeoutId = setTimeout(tick, intervalMs);
        }
      } catch {
        if (!cancelled) {
          timeoutId = setTimeout(tick, intervalMs);
        }
      }
    }

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, resetKey]);
}
