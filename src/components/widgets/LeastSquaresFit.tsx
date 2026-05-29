import { useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Least squares as projection: fit y ~ polynomial(x) to draggable data points by solving
// the normal equations A^T A x_hat = A^T b. The fitted curve is the projection of the data
// onto the column space of A; the vertical residual segments are the error e = b - A x_hat,
// and least squares minimizes their total squared length ‖e‖².

const W = 440;
const H = 320;
const PAD = { left: 40, right: 16, top: 16, bottom: 32 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const XMAX = 10;
const YMAX = 10;
const ACCENT = 'var(--sl-color-accent)';
const FIT = '#3b82f6';
const RES = '#e11d48';

const xPix = (x: number) => PAD.left + (x / XMAX) * PW;
const yPix = (y: number) => PAD.top + PH - (y / YMAX) * PH;

// Solve an (n x n) system by Gaussian elimination with partial pivoting (small n).
function solve(Ain: number[][], bin: number[]): number[] {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || A[c][c] === 0) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => (A[i][i] === 0 ? 0 : v / A[i][i]));
}

// Least-squares polynomial coefficients (degree d) via the normal equations.
function fitPoly(pts: { x: number; y: number }[], d: number): number[] {
  const m = d + 1;
  const ATA = Array.from({ length: m }, () => new Array(m).fill(0));
  const ATb = new Array(m).fill(0);
  for (const { x, y } of pts) {
    const row = Array.from({ length: m }, (_, j) => x ** j);
    for (let i = 0; i < m; i++) {
      ATb[i] += row[i] * y;
      for (let j = 0; j < m; j++) ATA[i][j] += row[i] * row[j];
    }
  }
  return solve(ATA, ATb);
}

const evalPoly = (coef: number[], x: number) => coef.reduce((s, c, j) => s + c * x ** j, 0);

// A valley-shaped point cloud: the best-fit line is nearly flat through the
// middle (large residuals), while the parabola hugs the curve (tiny residual),
// so the two fits look dramatically different.
const INIT = [
  { x: 1.0, y: 6.3 },
  { x: 2.3, y: 3.4 },
  { x: 3.5, y: 2.1 },
  { x: 5.0, y: 1.1 },
  { x: 6.5, y: 1.9 },
  { x: 7.7, y: 3.7 },
  { x: 9.0, y: 6.1 },
];

export default function LeastSquaresFit() {
  const [pts, setPts] = useState(INIT.map((p) => ({ ...p })));
  const [deg, setDeg] = useState(1);
  const drag = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const coef = fitPoly(pts, deg);
  const resid = pts.map((p) => p.y - evalPoly(coef, p.x));
  const normE = Math.sqrt(resid.reduce((s, r) => s + r * r, 0));

  const curve: string = (() => {
    const out: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * XMAX;
      out.push(`${xPix(x).toFixed(1)},${yPix(Math.max(-1, Math.min(YMAX + 1, evalPoly(coef, x)))).toFixed(1)}`);
    }
    return out.join(' ');
  })();

  function toData(e: PointerEvent) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const vy = ((e.clientY - rect.top) / rect.height) * H;
    const x = Math.max(0, Math.min(XMAX, ((vx - PAD.left) / PW) * XMAX));
    const y = Math.max(0, Math.min(YMAX, ((PAD.top + PH - vy) / PH) * YMAX));
    return { x, y };
  }

  function onMove(e: PointerEvent) {
    if (drag.current === null) return;
    const { x, y } = toData(e);
    setPts((cur) => cur.map((p, i) => (i === drag.current ? { x, y } : p)));
  }

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          <button
            class={styles.button}
            style={deg === 1 ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
            onClick={() => setDeg(1)}
          >
            Line
          </button>
          <button
            class={styles.button}
            style={deg === 2 ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
            onClick={() => setDeg(2)}
          >
            Parabola
          </button>
          <button class={styles.button} onClick={() => setPts(INIT.map((p) => ({ ...p })))}>
            reset points
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Least-squares fit to draggable data points"
        style={{ touchAction: 'none' }}
        onPointerMove={onMove}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        {/* axes */}
        <line x1={xPix(0)} y1={yPix(0)} x2={xPix(XMAX)} y2={yPix(0)} stroke="currentColor" stroke-opacity="0.5" />
        <line x1={xPix(0)} y1={yPix(0)} x2={xPix(0)} y2={yPix(YMAX)} stroke="currentColor" stroke-opacity="0.5" />
        {[2, 4, 6, 8, 10].map((t) => (
          <>
            <text x={xPix(t)} y={yPix(0) + 16} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.7">{t}</text>
            <text x={xPix(0) - 8} y={yPix(t) + 3} font-size="10" text-anchor="end" fill="currentColor" fill-opacity="0.7">{t}</text>
          </>
        ))}

        {/* residual segments */}
        {pts.map((p) => (
          <line x1={xPix(p.x)} y1={yPix(p.y)} x2={xPix(p.x)} y2={yPix(evalPoly(coef, p.x))} stroke={RES} stroke-width="1.5" stroke-opacity="0.8" />
        ))}

        {/* fitted curve */}
        <polyline points={curve} fill="none" stroke={FIT} stroke-width="2.2" />

        {/* data points (draggable) */}
        {pts.map((p, i) => (
          <circle
            cx={xPix(p.x)}
            cy={yPix(p.y)}
            r="6"
            fill={ACCENT}
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

      <div class={styles.legend}>
        <span>
          Drag the points. The {deg === 1 ? 'line' : 'parabola'} minimizes the total squared residual{' '}
          <strong>‖e‖ = {normE.toFixed(2)}</strong>; the red segments are the errors eᵢ, the residual of the projection of the
          data onto the column space of A.
        </span>
      </div>
    </div>
  );
}
