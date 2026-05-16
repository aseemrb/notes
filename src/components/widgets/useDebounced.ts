import { useEffect, useState } from 'preact/hooks';

/**
 * Return a debounced copy of `value` that lags by `delay` ms.
 * Lets a slider's display value update instantly while the
 * heavy computation downstream only re-runs once dragging settles.
 */
export function useDebounced<T>(value: T, delay = 60): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
