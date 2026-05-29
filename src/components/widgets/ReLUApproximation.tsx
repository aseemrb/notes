import { useMemo, useState } from 'preact/hooks';
import styles from './widget.module.css';

// One hidden layer of ReLU units fitting a 1D target. Hidden unit j computes the
// hinge max(0, w_j x + b_j) with a kink at x = t_j; the kink locations t_j are a
// fixed (seeded) spread across the domain. With the hinges fixed, the output
// weights c_j and bias d are fit by least squares (normal equations) to the
// target samples. Sliding the unit count m adds breakpoints and drives the
// piecewise-linear fit toward the curve -- universal approximation in action.

const W = 460;
const H = 300;
const PAD = { l: 36, r: 14, t: 14, b: 28 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;
const N = 121; // samples on the domain
const XMIN = -1;
const XMAX = 1;
const MAXU = 40;

const ACCENT = 'var(--sl-color-accent)';
const TARGET = '#3b82f6';

// deterministic PRNG so the random features are stable across re-renders
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Target = { key: string; label: string; f: (x: number) => number };
const TARGETS: Target[] = [
  { key: 'sine', label: 'Sine', f: (x) => Math.sin(2.6 * x) },
  { key: 'bump', label: 'Bump', f: (x) => Math.exp(-6 * x * x) - 0.3 },
  { key: 'wave', label: 'Wave', f: (x) => 0.7 * Math.sin(2 * x) + 0.3 * Math.sin(6 * x) },
];

// Gaussian elimination with partial pivoting for small dense systems.
function solve(Ain: number[][], bin: number[]): number[] {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    const piv = A[c][c] || 1e-12;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / piv;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => v / (A[i][i] || 1e-12));
}

const xs = Array.from({ length: N }, (_, i) => XMIN + ((XMAX - XMIN) * i) / (N - 1));

export default function ReLUApproximation() {
  const [target, setTarget] = useState('sine');
  const [m, setM] = useState(6);
  const [seed, setSeed] = useState(1);

  // fixed pool of MAXU hinge features for this seed; using the first m keeps the
  // existing hinges in place as m grows.
  const pool = useMemo(() => {
    const rnd = mulberry32(seed * 2654435761);
    return Array.from({ length: MAXU }, () => {
      const t = XMIN + (XMAX - XMIN) * rnd(); // kink location
      const sign = rnd() < 0.5 ? -1 : 1;
      return { t, w: sign, b: -sign * t };
    });
  }, [seed]);

  const tgt = TARGETS.find((t) => t.key === target)!;

  const { fit, rmse, units } = useMemo(() => {
    const units = pool.slice(0, m);
    const y = xs.map((x) => tgt.f(x));
    // design matrix columns: hinges phi_j(x) plus a constant
    const feat = (x: number) => [...units.map((u) => Math.max(0, u.w * x + u.b)), 1];
    const P = units.length + 1;
    const ATA = Array.from({ length: P }, () => new Array(P).fill(0));
    const ATb = new Array(P).fill(0);
    for (let i = 0; i < N; i++) {
      const row = feat(xs[i]);
      for (let a = 0; a < P; a++) {
        ATb[a] += row[a] * y[i];
        for (let b = 0; b < P; b++) ATA[a][b] += row[a] * row[b];
      }
    }
    for (let a = 0; a < P; a++) ATA[a][a] += 1e-6; // ridge for stability
    const coef = solve(ATA, ATb);
    const predict = (x: number) => feat(x).reduce((s, v, j) => s + v * coef[j], 0);
    const fit = xs.map((x) => predict(x));
    const err = Math.sqrt(fit.reduce((s, p, i) => s + (p - y[i]) ** 2, 0) / N);
    return { fit, rmse: err, units };
  }, [pool, m, target]);

  // y-range from target and fit
  const yvals = xs.map((x) => tgt.f(x)).concat(fit);
  const ymin = Math.min(...yvals);
  const ymax = Math.max(...yvals);
  const pad = 0.12 * (ymax - ymin || 1);
  const yLo = ymin - pad;
  const yHi = ymax + pad;

  const px = (x: number) => PAD.l + ((x - XMIN) / (XMAX - XMIN)) * PW;
  const py = (y: number) => PAD.t + PH - ((y - yLo) / (yHi - yLo)) * PH;

  const path = (vals: number[]) => vals.map((y, i) => `${px(xs[i]).toFixed(1)},${py(y).toFixed(1)}`).join(' ');

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          {TARGETS.map((t) => (
            <button
              class={styles.button}
              style={target === t.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
              onClick={() => setTarget(t.key)}
            >
              {t.label}
            </button>
          ))}
          <button class={styles.button} onClick={() => setSeed((s) => s + 1)}>
            resample hinges
          </button>
        </div>
        <div class={styles.controlGroup} style={{ flex: 1, minWidth: '12rem' }}>
          <label class={styles.controlLabel} for="relu-m">
            hidden units m = <span class={styles.controlValue}>{m}</span>
          </label>
          <input id="relu-m" class={styles.slider} type="range" min="1" max={MAXU} step="1" value={m} onInput={(e) => setM(parseInt(e.currentTarget.value, 10))} />
        </div>
      </div>

      <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ReLU network fitting a target curve">
        {/* axes */}
        <line x1={px(XMIN)} y1={py(0)} x2={px(XMAX)} y2={py(0)} stroke="currentColor" stroke-opacity="0.25" />
        <line x1={px(0)} y1={PAD.t} x2={px(0)} y2={PAD.t + PH} stroke="currentColor" stroke-opacity="0.25" />
        {/* breakpoints (hinge kinks) */}
        {units.map((u) =>
          u.t > XMIN && u.t < XMAX ? (
            <line x1={px(u.t)} y1={PAD.t + PH} x2={px(u.t)} y2={PAD.t + PH - 8} stroke={ACCENT} stroke-opacity="0.5" stroke-width="1.5" />
          ) : null,
        )}
        {/* target */}
        <polyline points={path(xs.map((x) => tgt.f(x)))} fill="none" stroke={TARGET} stroke-width="2" stroke-dasharray="5 4" />
        {/* network fit */}
        <polyline points={path(fit)} fill="none" stroke={ACCENT} stroke-width="2.4" />
      </svg>

      <div class={styles.legend}>
        <span>
          <span class={styles.legendSwatch} style={{ background: TARGET }} />target&nbsp;&nbsp;
          <span class={styles.legendSwatch} style={{ background: 'var(--sl-color-accent)' }} />network fit (ticks mark the hinge breakpoints). Root-mean-square
          error <strong>{rmse.toFixed(3)}</strong> with <strong>{m}</strong> ReLU units. More units add breakpoints and lower the error toward zero.
        </span>
      </div>
    </div>
  );
}
