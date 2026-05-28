import { useEffect, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Power iteration on a 2x2 matrix. Starting from a random unit vector, the iterate
//   v_{k+1} = A v_k / ‖A v_k‖
// turns toward the eigenvector belonging to the largest-modulus eigenvalue, at rate
// |λ_2|/|λ_1|. The dashed lines mark the two true eigenvectors; the Rayleigh
// quotient v^T A v approaches the dominant eigenvalue.

const W = 340;
const H = 340;
const CX = 170;
const CY = 170;
const R = 130;
const ACCENT = 'var(--sl-color-accent)';
const ITER = '#3b82f6';
const MAX_ITERS = 30;

const px = (x: number) => CX + x * R;
const py = (y: number) => CY - y * R;

type V = { x: number; y: number };
const mul = (a: number, b: number, c: number, d: number, v: V): V => ({ x: a * v.x + b * v.y, y: c * v.x + d * v.y });
const norm = (v: V) => {
  const n = Math.hypot(v.x, v.y);
  return n > 1e-12 ? { x: v.x / n, y: v.y / n } : v;
};
const randUnit = (): V => {
  const t = Math.random() * 2 * Math.PI;
  return { x: Math.cos(t), y: Math.sin(t) };
};

function eigen(a11: number, a12: number, a21: number, a22: number) {
  const tr = a11 + a22;
  const det = a11 * a22 - a12 * a21;
  const disc = tr * tr - 4 * det;
  if (disc < -1e-9) return null;
  const sq = Math.sqrt(Math.max(0, disc));
  const l1 = (tr + sq) / 2;
  const l2 = (tr - sq) / 2;
  const ev = (lam: number) => {
    let v: V;
    if (Math.abs(a12) > 1e-9) v = { x: a12, y: lam - a11 };
    else if (Math.abs(a21) > 1e-9) v = { x: lam - a22, y: a21 };
    else v = Math.abs(lam - a11) < 1e-9 ? { x: 1, y: 0 } : { x: 0, y: 1 };
    return norm(v);
  };
  return { l1, l2, v1: ev(l1), v2: ev(l2) };
}

function NumberCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step={1}
      value={value}
      onInput={(e) => {
        const v = parseFloat(e.currentTarget.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
      style={{
        width: '3rem',
        textAlign: 'center',
        padding: '0.15rem 0.2rem',
        background: 'var(--sl-color-bg)',
        color: 'inherit',
        border: '1px solid var(--sl-color-gray-5)',
        borderRadius: '4px',
        font: 'inherit',
      }}
    />
  );
}

export default function PowerIteration() {
  const [a11, setA11] = useState(2);
  const [a12, setA12] = useState(1);
  const [a21, setA21] = useState(1);
  const [a22, setA22] = useState(2);
  const [seed, setSeed] = useState(0);
  const [iter, setIter] = useState<V[]>(() => [randUnit()]);
  const [playing, setPlaying] = useState(false);

  // Reset trail on matrix or seed change
  useEffect(() => {
    setIter([randUnit()]);
    setPlaying(false);
  }, [a11, a12, a21, a22, seed]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setIter((cur) => {
        if (cur.length >= MAX_ITERS) {
          setPlaying(false);
          return cur;
        }
        const last = cur[cur.length - 1];
        return [...cur, norm(mul(a11, a12, a21, a22, last))];
      });
    }, 240);
    return () => clearInterval(id);
  }, [playing, a11, a12, a21, a22]);

  const step = () =>
    setIter((cur) =>
      cur.length >= MAX_ITERS ? cur : [...cur, norm(mul(a11, a12, a21, a22, cur[cur.length - 1]))],
    );

  const eig = eigen(a11, a12, a21, a22);
  const top = eig ? (Math.abs(eig.l1) >= Math.abs(eig.l2) ? { lam: eig.l1, v: eig.v1 } : { lam: eig.l2, v: eig.v2 }) : null;
  const second = eig ? (Math.abs(eig.l1) >= Math.abs(eig.l2) ? { lam: eig.l2, v: eig.v2 } : { lam: eig.l1, v: eig.v1 }) : null;

  const v = iter[iter.length - 1];
  const Av = mul(a11, a12, a21, a22, v);
  const rq = v.x * Av.x + v.y * Av.y;

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          <em style={{ opacity: 0.75 }}>A&nbsp;=</em>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
            <NumberCell value={a11} onChange={setA11} />
            <NumberCell value={a12} onChange={setA12} />
            <NumberCell value={a21} onChange={setA21} />
            <NumberCell value={a22} onChange={setA22} />
          </div>
        </div>
        <div class={styles.controlRow}>
          <button class={styles.button} onClick={() => { setPlaying(false); step(); }}>
            Step
          </button>
          <button
            class={styles.button}
            style={playing ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Animate'}
          </button>
          <button class={styles.button} onClick={() => setSeed((s) => s + 1)}>
            Reset
          </button>
        </div>
      </div>

      <svg class={styles.chart} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Power iteration converging on the unit circle to the dominant eigenvector">
        {/* axes */}
        <line x1={CX - R - 12} y1={CY} x2={CX + R + 12} y2={CY} stroke="currentColor" stroke-opacity="0.25" />
        <line x1={CX} y1={CY - R - 12} x2={CX} y2={CY + R + 12} stroke="currentColor" stroke-opacity="0.25" />
        {/* unit circle */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="currentColor" stroke-opacity="0.32" />
        {/* eigenvectors (real case) */}
        {eig && (
          <>
            <line
              x1={px(-top!.v.x)}
              y1={py(-top!.v.y)}
              x2={px(top!.v.x)}
              y2={py(top!.v.y)}
              stroke={ACCENT}
              stroke-width="1.6"
              stroke-dasharray="6 5"
              stroke-opacity="0.9"
            />
            <line
              x1={px(-second!.v.x)}
              y1={py(-second!.v.y)}
              x2={px(second!.v.x)}
              y2={py(second!.v.y)}
              stroke="currentColor"
              stroke-width="1.2"
              stroke-dasharray="4 4"
              stroke-opacity="0.4"
            />
          </>
        )}
        {/* iterate trail */}
        {iter.map((it, i) => {
          const isLast = i === iter.length - 1;
          const op = isLast ? 1 : 0.15 + 0.7 * (i / Math.max(1, iter.length - 1));
          return (
            <line
              x1={CX}
              y1={CY}
              x2={px(it.x)}
              y2={py(it.y)}
              stroke={isLast ? ITER : 'currentColor'}
              stroke-width={isLast ? 2.4 : 1.1}
              stroke-opacity={op}
            />
          );
        })}
        <circle cx={px(v.x)} cy={py(v.y)} r="5" fill={ITER} />
      </svg>

      <div class={styles.legend}>
        <span>
          step <strong>{iter.length - 1}</strong>; Rayleigh quotient v<sup>T</sup>Av = <strong>{rq.toFixed(3)}</strong>
          {eig ? (
            <>
              ; dominant eigenvalue λ₁ = <strong>{top!.lam.toFixed(3)}</strong>, convergence rate |λ₂/λ₁| ={' '}
              <strong>{Math.abs(top!.lam) < 1e-9 ? '—' : (Math.abs(second!.lam) / Math.abs(top!.lam)).toFixed(3)}</strong>.
            </>
          ) : (
            <>
              . <strong>Complex eigenvalues</strong>: no real eigenvector; the iterate spirals.
            </>
          )}
        </span>
      </div>
    </div>
  );
}
