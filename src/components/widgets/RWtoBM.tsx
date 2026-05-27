import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Donsker / diffusive scaling: the rescaled random walk
//   t ↦ S_{⌊nt⌋} / √n,   t ∈ [0, 1]
// converges in distribution to Brownian motion as n → ∞. Dragging n (or hitting
// animate) refines the same underlying ±1 increments into an ever finer path,
// while the ±√t and ±2√t envelopes mark the limiting standard-deviation bands.

const W = 600;
const H = 320;
const PAD = { left: 44, right: 14, top: 14, bottom: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const MAX_N = 4000;
const ACCENT = 'var(--sl-color-accent)';

export default function RWtoBM() {
  const [n, setN] = useState(16);
  const [seed, setSeed] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Underlying ±1 increments, fixed until reseeded so the slider/animation only
  // changes the resolution, not the randomness.
  const incr = useMemo(() => {
    const a = new Int8Array(MAX_N);
    for (let i = 0; i < MAX_N; i++) a[i] = Math.random() < 0.5 ? -1 : 1;
    return a;
  }, [seed]);

  // Animate n on a log ramp from small to MAX_N, then stop.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let logn = Math.log(Math.max(8, n));
    const logMax = Math.log(MAX_N);
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      logn = Math.min(logMax, logn + dt * 1.6);
      const next = Math.round(Math.exp(logn));
      setN(next);
      if (next >= MAX_N) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, seed]);

  const { poly, yMax } = useMemo(() => {
    const sqrtN = Math.sqrt(n);
    // partial sums S_k for k = 0..n, rescaled
    const vals = new Float64Array(n + 1);
    let s = 0;
    let peak = 1.2;
    for (let k = 1; k <= n; k++) {
      s += incr[k - 1];
      vals[k] = s / sqrtN;
      const a = Math.abs(vals[k]);
      if (a > peak) peak = a;
    }
    const yMax = Math.max(2.2, peak * 1.08);
    const xOf = (t: number) => PAD.left + t * PLOT_W;
    const yOf = (v: number) => PAD.top + PLOT_H / 2 - (v / yMax) * (PLOT_H / 2);
    const stride = Math.max(1, Math.floor(n / 900));
    const pts: string[] = [];
    for (let k = 0; k <= n; k += stride) {
      pts.push(`${xOf(k / n).toFixed(2)},${yOf(vals[k]).toFixed(2)}`);
    }
    pts.push(`${xOf(1).toFixed(2)},${yOf(vals[n]).toFixed(2)}`);
    return { poly: pts.join(' '), yMax };
  }, [incr, n]);

  const xOf = (t: number) => PAD.left + t * PLOT_W;
  const yOf = (v: number) => PAD.top + PLOT_H / 2 - (v / yMax) * (PLOT_H / 2);

  // ±c√t envelope paths
  function envelope(c: number, sign: number): string {
    const pts: string[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      pts.push(`${xOf(t).toFixed(2)},${yOf(sign * c * Math.sqrt(t)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlGroup}>
          <label class={styles.controlLabel} for="rwbm-n">
            steps n = <span class={styles.controlValue}>{n}</span>
          </label>
          <input
            id="rwbm-n"
            class={styles.slider}
            type="range"
            min="4"
            max={MAX_N}
            step="1"
            value={n}
            onInput={(e) => {
              setPlaying(false);
              setN(parseInt(e.currentTarget.value, 10));
            }}
          />
        </div>
        <div class={styles.controlGroup}>
          <span class={styles.controlLabel}>&nbsp;</span>
          <div class={styles.controlRow}>
            <button class={styles.button} onClick={() => setPlaying((p) => !p)}>
              {playing ? 'pause' : 'animate'}
            </button>
            <button
              class={styles.button}
              onClick={() => {
                setPlaying(false);
                setN(16);
                setSeed((s) => s + 1);
              }}
            >
              resample
            </button>
          </div>
        </div>
      </div>

      <svg
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Random walk rescaled by the square root of the number of steps, converging to Brownian motion"
        shape-rendering="geometricPrecision"
      >
        {/* zero axis */}
        <line x1={PAD.left} y1={yOf(0)} x2={PAD.left + PLOT_W} y2={yOf(0)} stroke="currentColor" stroke-opacity="0.35" />

        {/* ±√t and ±2√t envelopes */}
        {[1, 2].map((c) => (
          <>
            <polyline points={envelope(c, 1)} fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 4" />
            <polyline points={envelope(c, -1)} fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 4" />
          </>
        ))}
        <text x={xOf(1) - 2} y={yOf(Math.sqrt(1)) - 4} text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.6">+√t</text>
        <text x={xOf(1) - 2} y={yOf(2 * Math.sqrt(1)) - 4} text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.6">+2√t</text>

        {/* rescaled walk */}
        <polyline points={poly} fill="none" stroke={ACCENT} stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round" />

        {/* x-axis */}
        <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H} stroke="currentColor" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text x={xOf(t)} y={PAD.top + PLOT_H + 18} text-anchor="middle" font-size="11" fill="currentColor">
            {t}
          </text>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={H - 2} text-anchor="middle" font-size="12" fill="currentColor">
          t = k / n
        </text>
      </svg>

      <div class={styles.legend}>
        <span>
          The walk <strong>S<sub>⌊nt⌋</sub> / √n</strong> on [0, 1]. As n grows it refines toward a Brownian path; the dashed
          curves are the limiting ±√t and ±2√t standard-deviation bands.
        </span>
      </div>
    </div>
  );
}
