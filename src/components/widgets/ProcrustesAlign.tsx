import { useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Orthogonal Procrustes in 2D. A fixed target shape Y and a draggable copy X.
// We centre both clouds, form M = Xc^T Yc, take its SVD, and the optimal
// orthogonal Q = U V^T rotates the centred X onto Y. The left panel shows the
// two clouds as positioned; the right panel shows X after applying Q, with the
// residual segments b - a whose total length is the Procrustes distance.

type P = { x: number; y: number };

// distinctive asymmetric polyline so rotation is visually obvious
const SHAPE: P[] = [
  { x: -0.8, y: -0.5 },
  { x: -0.8, y: 0.5 },
  { x: -0.2, y: -0.1 },
  { x: 0.3, y: 0.5 },
  { x: 0.3, y: -0.5 },
  { x: 0.8, y: 0.2 },
];

const rot = (p: P, t: number): P => ({ x: Math.cos(t) * p.x - Math.sin(t) * p.y, y: Math.sin(t) * p.x + Math.cos(t) * p.y });
// initial X: Y rotated by ~55 degrees with a little per-point jitter baked in
const INIT_X: P[] = SHAPE.map((p, i) => {
  const r = rot(p, 0.96);
  const j = [0.05, -0.04, 0.06, -0.03, 0.04, -0.05][i];
  return { x: r.x + j, y: r.y - j };
});

const centroid = (pts: P[]): P => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});

// SVD of a 2x2 matrix via the symmetric eigenproblem of M^T M; returns Q = U V^T.
function procrustesQ(X: P[], Y: P[]): { Q: number[][]; angle: number } {
  // M = sum_i xc_i yc_i^T  (2x2)
  let m00 = 0, m01 = 0, m10 = 0, m11 = 0;
  for (let i = 0; i < X.length; i++) {
    m00 += X[i].x * Y[i].x;
    m01 += X[i].x * Y[i].y;
    m10 += X[i].y * Y[i].x;
    m11 += X[i].y * Y[i].y;
  }
  // S = M^T M = [[p, q],[q, r]]
  const p = m00 * m00 + m10 * m10;
  const q = m00 * m01 + m10 * m11;
  const r = m01 * m01 + m11 * m11;
  const tr = p + r;
  const dsc = Math.sqrt(Math.max(0, ((p - r) / 2) ** 2 + q * q));
  const l1 = tr / 2 + dsc;
  const l2 = tr / 2 - dsc;
  // eigenvectors of S (columns of V)
  const ev = (lam: number): P => {
    if (Math.abs(q) > 1e-12) {
      const v = { x: q, y: lam - p };
      const n = Math.hypot(v.x, v.y) || 1;
      return { x: v.x / n, y: v.y / n };
    }
    return p >= r ? { x: 1, y: 0 } : { x: 0, y: 1 };
  };
  const v1 = ev(l1);
  const v2 = { x: -v1.y, y: v1.x }; // orthogonal
  const s1 = Math.sqrt(Math.max(1e-12, l1));
  const s2 = Math.sqrt(Math.max(1e-12, l2));
  // U columns: u_i = M v_i / sigma_i
  const Mv = (v: P): P => ({ x: m00 * v.x + m01 * v.y, y: m10 * v.x + m11 * v.y });
  const u1raw = Mv(v1);
  const u2raw = Mv(v2);
  const u1 = { x: u1raw.x / s1, y: u1raw.y / s1 };
  const u2 = { x: u2raw.x / s2, y: u2raw.y / s2 };
  // Q = U V^T  where U = [u1 u2], V = [v1 v2] solves min ||X Q - Y|| with points as ROWS.
  const Q = [
    [u1.x * v1.x + u2.x * v2.x, u1.x * v1.y + u2.x * v2.y],
    [u1.y * v1.x + u2.y * v2.x, u1.y * v1.y + u2.y * v2.y],
  ];
  // Each point is a column vector here, and (X Q)_i = Q^T x_i, so the rotation
  // actually applied to a point is Q^T. Return that as R.
  const R = [
    [Q[0][0], Q[1][0]],
    [Q[0][1], Q[1][1]],
  ];
  return { Q: R, angle: Math.atan2(R[1][0], R[0][0]) };
}

const apply = (Q: number[][], p: P): P => ({ x: Q[0][0] * p.x + Q[0][1] * p.y, y: Q[1][0] * p.x + Q[1][1] * p.y });

const VB = 220;
const SCALE = 78;
const C = VB / 2;
const px = (x: number) => C + x * SCALE;
const py = (y: number) => C - y * SCALE;

const ACCENT = 'var(--sl-color-accent)';
const BLUE = '#3b82f6';
const RES = '#e11d48';

function poly(pts: P[]): string {
  return pts.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
}

export default function ProcrustesAlign() {
  const [X, setX] = useState<P[]>(INIT_X.map((p) => ({ ...p })));
  const drag = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const Y = SHAPE;
  const cy = centroid(Y);
  const cx = centroid(X);
  const Yc = Y.map((p) => ({ x: p.x - cy.x, y: p.y - cy.y }));
  const Xc = X.map((p) => ({ x: p.x - cx.x, y: p.y - cx.y }));
  const { Q, angle } = procrustesQ(Xc, Yc);
  const aligned = Xc.map((p) => apply(Q, p)); // centred at origin, compare to Yc
  const resid = Math.sqrt(aligned.reduce((s, a, i) => s + (a.x - Yc[i].x) ** 2 + (a.y - Yc[i].y) ** 2, 0));

  function toData(e: PointerEvent) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * VB;
    const vy = ((e.clientY - rect.top) / rect.height) * VB;
    return { x: (vx - C) / SCALE, y: (C - vy) / SCALE };
  }
  function onMove(e: PointerEvent) {
    if (drag.current === null) return;
    const d = toData(e);
    setX((cur) => cur.map((p, i) => (i === drag.current ? d : p)));
  }

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          <button class={styles.button} onClick={() => setX(INIT_X.map((p) => ({ ...p })))}>
            reset shape
          </button>
          <button class={styles.button} onClick={() => setX(SHAPE.map((p) => rot(p, 2.4)))}>
            rotate more
          </button>
        </div>
        <span style={{ fontSize: '0.85em' }}>
          drag the blue points
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center' }}>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VB} ${VB}`}
            style={{ width: '100%', maxWidth: '220px', height: 'auto', touchAction: 'none', border: '1px solid var(--sl-color-gray-5)', borderRadius: '6px' }}
            role="img"
            aria-label="target shape and draggable shape, as positioned"
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerLeave={() => (drag.current = null)}
          >
            <polyline points={poly(Y)} fill="none" stroke={ACCENT} stroke-width="2" stroke-opacity="0.9" />
            {Y.map((p) => (
              <circle cx={px(p.x)} cy={py(p.y)} r="4" fill={ACCENT} />
            ))}
            <polyline points={poly(X)} fill="none" stroke={BLUE} stroke-width="2" stroke-dasharray="5 4" stroke-opacity="0.9" />
            {X.map((p, i) => (
              <circle
                cx={px(p.x)}
                cy={py(p.y)}
                r="6"
                fill={BLUE}
                stroke="var(--sl-color-bg)"
                stroke-width="1.5"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => {
                  drag.current = i;
                  (e.currentTarget as Element).setPointerCapture?.((e as PointerEvent).pointerId);
                }}
              />
            ))}
          </svg>
          <figcaption style={{ fontSize: '0.8em', color: 'var(--sl-color-text)' }}>as positioned: target Y, movable X</figcaption>
        </figure>

        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
          <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: '100%', maxWidth: '220px', height: 'auto', border: '1px solid var(--sl-color-gray-5)', borderRadius: '6px' }} role="img" aria-label="X aligned to Y by the optimal rotation">
            {/* residual segments */}
            {aligned.map((a, i) => (
              <line x1={px(a.x)} y1={py(a.y)} x2={px(Yc[i].x)} y2={py(Yc[i].y)} stroke={RES} stroke-width="1.5" stroke-opacity="0.8" />
            ))}
            <polyline points={poly(Yc)} fill="none" stroke={ACCENT} stroke-width="2" stroke-opacity="0.9" />
            {Yc.map((p) => (
              <circle cx={px(p.x)} cy={py(p.y)} r="4" fill={ACCENT} />
            ))}
            <polyline points={poly(aligned)} fill="none" stroke={BLUE} stroke-width="2" stroke-opacity="0.9" />
            {aligned.map((p) => (
              <circle cx={px(p.x)} cy={py(p.y)} r="4" fill={BLUE} />
            ))}
          </svg>
          <figcaption style={{ fontSize: '0.8em', color: 'var(--sl-color-text)' }}>after the optimal Q = UVᵀ</figcaption>
        </figure>
      </div>

      <div class={styles.legend}>
        <span>
          Optimal rotation <strong>{((angle * 180) / Math.PI).toFixed(0)}°</strong>, Procrustes residual{' '}
          <strong>‖XcQ − Yc‖_F = {resid.toFixed(3)}</strong>. The SVD of M = Xcᵀ Yc gives Q = UVᵀ, the orthogonal matrix that lands the centred
          blue shape as close as possible on the accent shape. Drag points to change the residual; only a rigid rotation can be undone, so
          stretching one cloud leaves error behind.
        </span>
      </div>
    </div>
  );
}
