import { useMemo, useState } from 'preact/hooks';

const W = 460;
const H = 360;
const PAD = 24;
const VIEW = 2.6;

const cx = W / 2;
const cy = H / 2;
const scale = Math.min(W / 2 - PAD, H / 2 - PAD) / VIEW;

const sx = (x: number) => cx + x * scale;
const sy = (y: number) => cy - y * scale;

const EIG_COLORS = ['#e11d48', '#2563eb'];

type EigsReal = {
  real: true;
  lambdas: [number, number];
  vecs: [[number, number], [number, number]];
};
type EigsComplex = {
  real: false;
  alpha: number;
  beta: number;
};
type Eigs = EigsReal | EigsComplex;

function eigenvec(
  a: number,
  b: number,
  c: number,
  d: number,
  lam: number,
): [number, number] {
  // Solve (A - λI) v = 0 for one nonzero v, then normalize.
  if (Math.abs(b) > 1e-10) {
    const v: [number, number] = [b, lam - a];
    const n = Math.hypot(v[0], v[1]);
    return [v[0] / n, v[1] / n];
  }
  if (Math.abs(c) > 1e-10) {
    const v: [number, number] = [lam - d, c];
    const n = Math.hypot(v[0], v[1]);
    return [v[0] / n, v[1] / n];
  }
  // Diagonal A: pick the axis closer to the matching eigenvalue.
  return Math.abs(lam - a) < Math.abs(lam - d) ? [1, 0] : [0, 1];
}

function computeEigs(a: number, b: number, c: number, d: number): Eigs {
  const tr = a + d;
  const det = a * d - b * c;
  const disc = tr * tr - 4 * det;
  if (disc >= -1e-12) {
    const sd = Math.sqrt(Math.max(0, disc));
    const l1 = (tr + sd) / 2;
    const l2 = (tr - sd) / 2;
    return {
      real: true,
      lambdas: [l1, l2],
      vecs: [eigenvec(a, b, c, d, l1), eigenvec(a, b, c, d, l2)],
    };
  }
  return { real: false, alpha: tr / 2, beta: Math.sqrt(-disc) / 2 };
}

interface ArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  width?: number;
  opacity?: number;
  headScale?: number;
}

function Arrow({
  fromX,
  fromY,
  toX,
  toY,
  color,
  width = 1.5,
  opacity = 1,
  headScale = 1,
}: ArrowProps) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 9 * headScale;
  const headW = 6 * headScale;
  const baseX = toX - ux * headLen;
  const baseY = toY - uy * headLen;
  const lineEndX = toX - ux * headLen * 0.5;
  const lineEndY = toY - uy * headLen * 0.5;
  const px = -uy;
  const py = ux;
  const leftX = baseX + (px * headW) / 2;
  const leftY = baseY + (py * headW) / 2;
  const rightX = baseX - (px * headW) / 2;
  const rightY = baseY - (py * headW) / 2;
  return (
    <g>
      <line
        x1={fromX}
        y1={fromY}
        x2={lineEndX}
        y2={lineEndY}
        stroke={color}
        stroke-width={width}
        stroke-opacity={opacity}
        stroke-linecap="round"
      />
      <polygon
        points={`${toX},${toY} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
        fill-opacity={opacity}
      />
    </g>
  );
}

const TEST_VECTOR_COUNT = 12;
const TEST_VECTORS: [number, number][] = Array.from(
  { length: TEST_VECTOR_COUNT },
  (_, i) => {
    const theta = (i / TEST_VECTOR_COUNT) * 2 * Math.PI;
    return [Math.cos(theta), Math.sin(theta)];
  },
);

const ELLIPSE_STEPS = 240;

export default function EigenvectorRotation() {
  const [a, setA] = useState(1.6);
  const [b, setB] = useState(0.4);
  const [c, setC] = useState(-0.2);
  const [d, setD] = useState(1.1);

  const eigs = useMemo(() => computeEigs(a, b, c, d), [a, b, c, d]);

  // Image ellipse: A · (unit circle)
  const ellipsePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= ELLIPSE_STEPS; i++) {
      const t = (i / ELLIPSE_STEPS) * 2 * Math.PI;
      const ct = Math.cos(t);
      const st = Math.sin(t);
      const x = a * ct + b * st;
      const y = c * ct + d * st;
      pts.push(`${i === 0 ? 'M' : 'L'} ${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`);
    }
    return pts.join(' ');
  }, [a, b, c, d]);

  const apply = (v: [number, number]): [number, number] => [
    a * v[0] + b * v[1],
    c * v[0] + d * v[1],
  ];

  const matrixA = (
    <span>
      A ={' '}
      <strong>
        [[{a.toFixed(2)}, {b.toFixed(2)}], [{c.toFixed(2)}, {d.toFixed(2)}]]
      </strong>
    </span>
  );

  const eigReadout = eigs.real ? (
    <span>
      <em>λ</em>₁ ={' '}
      <span style={{ color: EIG_COLORS[0], fontWeight: 600 }}>
        {eigs.lambdas[0].toFixed(3)}
      </span>
      ,&nbsp;
      <em>λ</em>₂ ={' '}
      <span style={{ color: EIG_COLORS[1], fontWeight: 600 }}>
        {eigs.lambdas[1].toFixed(3)}
      </span>
    </span>
  ) : (
    <span style={{ color: '#d97706', fontWeight: 600 }}>
      complex eigenvalues: λ = {eigs.alpha.toFixed(3)} ± {eigs.beta.toFixed(3)} i — no real
      direction
    </span>
  );

  return (
    <div
      style={{
        margin: '1.5rem 0',
        color: 'var(--sl-color-text)',
        padding: '1.25rem',
        border: '1px solid var(--sl-color-gray-5)',
        borderRadius: '8px',
        background: 'var(--sl-color-bg-nav)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: '1.8rem',
          alignItems: 'center',
          gap: '0.4rem 1.25rem',
          marginBottom: '0.75rem',
          fontSize: '0.95em',
        }}
      >
        {([['a', a, setA], ['b', b, setB], ['c', c, setC], ['d', d, setD]] as const).map(
          ([name, val, setter]) => (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                height: '100%',
                margin: 0,
                lineHeight: 1,
              }}
            >
              <span
                style={{
                  minWidth: '4.25rem',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
              >
                <em>{name}</em> = <strong>{val.toFixed(2)}</strong>
              </span>
              <input
                type="range"
                min="-2"
                max="2"
                step="0.05"
                value={val}
                onInput={(e) => setter(parseFloat(e.currentTarget.value))}
                style={{
                  flex: 1,
                  margin: 0,
                  accentColor: 'var(--sl-color-accent)',
                }}
              />
            </label>
          ),
        )}
      </div>

      <div
        style={{
          fontSize: '0.85em',
          marginBottom: '0.5rem',
          color: 'var(--sl-color-text-accent)',
        }}
      >
        {matrixA} &nbsp;·&nbsp; {eigReadout}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: '520px', height: 'auto', display: 'block', margin: '0 auto' }}
        aria-label="Test vectors before and after applying matrix A; eigenvectors are the ones that don't rotate"
        shape-rendering="geometricPrecision"
      >
        {/* Reference unit circle */}
        <circle
          cx={cx}
          cy={cy}
          r={scale}
          fill="none"
          stroke="currentColor"
          stroke-opacity="0.18"
          stroke-dasharray="3 3"
        />

        {/* Image ellipse A·(unit circle) */}
        <path
          d={ellipsePath}
          fill="var(--sl-color-accent)"
          fill-opacity="0.08"
          stroke="var(--sl-color-accent)"
          stroke-width="1.2"
          stroke-opacity="0.5"
        />

        {/* Axes */}
        <line
          x1={PAD}
          y1={cy}
          x2={W - PAD}
          y2={cy}
          stroke="currentColor"
          stroke-opacity="0.3"
        />
        <line
          x1={cx}
          y1={PAD}
          x2={cx}
          y2={H - PAD}
          stroke="currentColor"
          stroke-opacity="0.3"
        />

        {/* "Before" arrows: unit vectors (faint) */}
        {TEST_VECTORS.map((v) => (
          <Arrow
            fromX={cx}
            fromY={cy}
            toX={sx(v[0])}
            toY={sy(v[1])}
            color="currentColor"
            width={1}
            opacity={0.35}
            headScale={0.7}
          />
        ))}

        {/* "After" arrows: A · v (accent) */}
        {TEST_VECTORS.map((v) => {
          const Av = apply(v);
          return (
            <Arrow
              fromX={cx}
              fromY={cy}
              toX={sx(Av[0])}
              toY={sy(Av[1])}
              color="var(--sl-color-accent)"
              width={1.6}
              opacity={0.9}
              headScale={0.85}
            />
          );
        })}

        {/* Eigenvectors: thick, both before and after */}
        {eigs.real &&
          eigs.vecs.map((v, i) => {
            const Av = apply(v);
            const negV: [number, number] = [-v[0], -v[1]];
            const negAv = apply(negV);
            const color = EIG_COLORS[i];
            return (
              <g>
                {/* unit eigenvector (both directions) on the unit circle */}
                <Arrow
                  fromX={cx}
                  fromY={cy}
                  toX={sx(v[0])}
                  toY={sy(v[1])}
                  color={color}
                  width={2.5}
                  opacity={0.55}
                />
                <Arrow
                  fromX={cx}
                  fromY={cy}
                  toX={sx(negV[0])}
                  toY={sy(negV[1])}
                  color={color}
                  width={2.5}
                  opacity={0.55}
                />
                {/* scaled image: λ · v (full strength) */}
                <Arrow
                  fromX={cx}
                  fromY={cy}
                  toX={sx(Av[0])}
                  toY={sy(Av[1])}
                  color={color}
                  width={3}
                  opacity={1}
                  headScale={1.1}
                />
                <Arrow
                  fromX={cx}
                  fromY={cy}
                  toX={sx(negAv[0])}
                  toY={sy(negAv[1])}
                  color={color}
                  width={3}
                  opacity={1}
                  headScale={1.1}
                />
                {/* eigenvalue label at tip */}
                <text
                  x={sx(Av[0]) + (Av[0] >= 0 ? 6 : -6)}
                  y={sy(Av[1]) + (Av[1] >= 0 ? -6 : 14)}
                  text-anchor={Av[0] >= 0 ? 'start' : 'end'}
                  font-size="12"
                  fill={color}
                  font-weight="600"
                >
                  λ{i === 0 ? '₁' : '₂'} v{i === 0 ? '₁' : '₂'}
                </text>
              </g>
            );
          })}
      </svg>

      <div
        style={{
          marginTop: '0.5rem',
          fontSize: '0.85em',
          color: 'var(--sl-color-text)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1.5rem',
          justifyContent: 'center',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '2px',
              background: 'currentColor',
              opacity: 0.35,
              marginRight: '0.4rem',
              verticalAlign: 'middle',
            }}
          />
          unit vectors (before)
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '2px',
              background: 'var(--sl-color-accent)',
              marginRight: '0.4rem',
              verticalAlign: 'middle',
            }}
          />
          A · v (after)
        </span>
        {eigs.real && (
          <>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '3px',
                  background: EIG_COLORS[0],
                  marginRight: '0.4rem',
                  verticalAlign: 'middle',
                }}
              />
              eigenvector v₁
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '3px',
                  background: EIG_COLORS[1],
                  marginRight: '0.4rem',
                  verticalAlign: 'middle',
                }}
              />
              eigenvector v₂
            </span>
          </>
        )}
      </div>
    </div>
  );
}
