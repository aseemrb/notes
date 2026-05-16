import { useMemo, useState } from 'preact/hooks';
import { useDebounced } from './useDebounced';
import styles from './widget.module.css';

const W = 640;
const H = 320;
const PANEL_W = (W - 16) / 2;
const PANEL_H = H;
const PAD = 24;

// Coordinate range: [-AXIS, AXIS] in both x and y.
const AXIS = 3;

function svd2x2(a: number, b: number, c: number, d: number) {
  // A^T A
  const m11 = a * a + c * c;
  const m12 = a * b + c * d;
  const m22 = b * b + d * d;
  // Eigenvalues of A^T A
  const tr = m11 + m22;
  const det = m11 * m22 - m12 * m12;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const lam1 = tr / 2 + disc;
  const lam2 = Math.max(0, tr / 2 - disc);
  const sigma1 = Math.sqrt(lam1);
  const sigma2 = Math.sqrt(lam2);
  // Right singular vectors: eigenvectors of A^T A
  const eigvec = (lam: number): [number, number] => {
    if (Math.abs(m12) > 1e-10) {
      const v: [number, number] = [m12, lam - m11];
      const n = Math.hypot(v[0], v[1]);
      return [v[0] / n, v[1] / n];
    }
    // Diagonal A^T A: eigenvectors are axes
    return Math.abs(lam - m11) < Math.abs(lam - m22) ? [1, 0] : [0, 1];
  };
  const v1 = eigvec(lam1);
  // Make v2 orthogonal to v1 (more stable than recomputing from lam2)
  const v2: [number, number] = [-v1[1], v1[0]];
  const applyA = (v: [number, number]): [number, number] => [
    a * v[0] + b * v[1],
    c * v[0] + d * v[1],
  ];
  return {
    sigma1,
    sigma2,
    v1,
    v2,
    Av1: applyA(v1),
    Av2: applyA(v2),
  };
}

interface PanelProps {
  cx: number; // viewBox-x of the panel's center
  title: string;
  ellipsePoints: string; // polyline points for the figure
  vectors: { vec: [number, number]; color: string; label: string }[];
  vectorOpacity: number;
}

function Panel({ cx, title, ellipsePoints, vectors, vectorOpacity }: PanelProps) {
  const cy = PANEL_H / 2;
  const scale = (PANEL_W / 2 - PAD) / AXIS;

  const sx = (x: number) => cx + x * scale;
  const sy = (y: number) => cy - y * scale;

  const axisTicks = [-2, -1, 1, 2];

  return (
    <g>
      {/* Panel border */}
      <rect
        x={cx - PANEL_W / 2}
        y={0}
        width={PANEL_W}
        height={PANEL_H}
        fill="none"
        stroke="currentColor"
        stroke-opacity="0.15"
      />
      <text
        x={cx}
        y={16}
        text-anchor="middle"
        font-size="12"
        fill="currentColor"
        fill-opacity="0.7"
      >
        {title}
      </text>

      {/* Axes */}
      <line
        x1={cx - PANEL_W / 2 + PAD}
        y1={cy}
        x2={cx + PANEL_W / 2 - PAD}
        y2={cy}
        stroke="currentColor"
        stroke-opacity="0.4"
      />
      <line
        x1={cx}
        y1={PAD}
        x2={cx}
        y2={PANEL_H - PAD}
        stroke="currentColor"
        stroke-opacity="0.4"
      />
      {axisTicks.map((t) => (
        <g>
          <line
            x1={sx(t)}
            y1={cy - 3}
            x2={sx(t)}
            y2={cy + 3}
            stroke="currentColor"
            stroke-opacity="0.4"
          />
          <line
            x1={cx - 3}
            y1={sy(t)}
            x2={cx + 3}
            y2={sy(t)}
            stroke="currentColor"
            stroke-opacity="0.4"
          />
        </g>
      ))}

      {/* Figure (circle or ellipse) */}
      <polyline
        points={ellipsePoints}
        fill="var(--sl-color-accent)"
        fill-opacity="0.15"
        stroke="var(--sl-color-accent)"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />

      {/* Vectors (faded out when σ₁ ≈ σ₂, since singular vectors are not unique) */}
      {vectorOpacity > 0.01 &&
        vectors.map(({ vec, color, label }) => {
          const x2 = sx(vec[0]);
          const y2 = sy(vec[1]);
          return (
            <g opacity={vectorOpacity}>
              <line
                x1={cx}
                y1={cy}
                x2={x2}
                y2={y2}
                stroke={color}
                stroke-width="2.5"
              />
              <circle cx={x2} cy={y2} r="3.5" fill={color} />
              <text
                x={x2 + (vec[0] >= 0 ? 6 : -6)}
                y={y2 + (vec[1] >= 0 ? -6 : 14)}
                text-anchor={vec[0] >= 0 ? 'start' : 'end'}
                font-size="12"
                fill={color}
                font-weight="600"
              >
                {label}
              </text>
            </g>
          );
        })}
    </g>
  );
}

export default function SVDEllipse() {
  const [a, setA] = useState(1.5);
  const [b, setB] = useState(0.5);
  const [c, setC] = useState(0.3);
  const [d, setD] = useState(1.2);

  // Debounce so heavy SVG repaints don't fire on every pixel of drag.
  // SVD is cheap, but stringifying 240 polyline points per render is not free.
  const dA = useDebounced(a, 20);
  const dB = useDebounced(b, 20);
  const dC = useDebounced(c, 20);
  const dD = useDebounced(d, 20);

  const { sigma1, sigma2, v1, v2, Av1, Av2 } = useMemo(
    () => svd2x2(dA, dB, dC, dD),
    [dA, dB, dC, dD],
  );

  // Singular vectors are not uniquely defined when σ₁ ≈ σ₂ (e.g., identity
  // matrix, any rotation). Fade the highlighted vectors out as the singular
  // values converge so the visual doesn't snap between arbitrary basis choices.
  const svConfidence = useMemo(() => {
    const sep = (sigma1 - sigma2) / (sigma1 + sigma2 + 1e-12);
    return Math.min(1, Math.max(0, sep * 12));
  }, [sigma1, sigma2]);

  // Parametric figures (high resolution for smooth curves)
  const STEPS = 240;
  const circlePoints = useMemo(() => {
    const pts: string[] = [];
    const scale = (PANEL_W / 2 - PAD) / AXIS;
    const cx = PANEL_W / 2;
    const cy = PANEL_H / 2;
    for (let i = 0; i <= STEPS; i++) {
      const theta = (i / STEPS) * 2 * Math.PI;
      pts.push(`${(cx + Math.cos(theta) * scale).toFixed(2)},${(cy - Math.sin(theta) * scale).toFixed(2)}`);
    }
    return pts.join(' ');
  }, []);

  const ellipsePoints = useMemo(() => {
    const pts: string[] = [];
    const scale = (PANEL_W / 2 - PAD) / AXIS;
    const cx = W - PANEL_W / 2;
    const cy = PANEL_H / 2;
    for (let i = 0; i <= STEPS; i++) {
      const theta = (i / STEPS) * 2 * Math.PI;
      const ct = Math.cos(theta);
      const st = Math.sin(theta);
      const x = dA * ct + dB * st;
      const y = dC * ct + dD * st;
      pts.push(`${(cx + x * scale).toFixed(2)},${(cy - y * scale).toFixed(2)}`);
    }
    return pts.join(' ');
  }, [dA, dB, dC, dD]);

  const COLOR_V1 = '#e11d48';
  const COLOR_V2 = '#16a34a';

  return (
    <div class={styles.widget}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: '1.8rem',
          alignItems: 'center',
          gap: '0.4rem 1.25rem',
          marginBottom: '0.5rem',
          fontSize: '0.95em',
        }}
      >
        {([['a', a, setA], ['b', b, setB], ['c', c, setC], ['d', d, setD]] as const).map(
          ([name, val, setter]) => (
            <label
              for={`svd-${name}`}
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
                id={`svd-${name}`}
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
          marginBottom: '0.75rem',
          fontSize: '0.9em',
          color: 'var(--sl-color-text-accent)',
        }}
      >
        A = <strong>[[{a.toFixed(2)}, {b.toFixed(2)}], [{c.toFixed(2)}, {d.toFixed(2)}]]</strong>
        &nbsp;·&nbsp;
        σ₁ = <strong>{sigma1.toFixed(3)}</strong>, σ₂ = <strong>{sigma2.toFixed(3)}</strong>
      </div>

      <svg
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Unit circle and its image under matrix A"
        shape-rendering="geometricPrecision"
      >
        <Panel
          cx={PANEL_W / 2}
          title="Unit circle (domain)"
          ellipsePoints={circlePoints}
          vectorOpacity={svConfidence}
          vectors={[
            { vec: v1, color: COLOR_V1, label: 'v₁' },
            { vec: v2, color: COLOR_V2, label: 'v₂' },
          ]}
        />
        <Panel
          cx={W - PANEL_W / 2}
          title="Image A · (unit circle)"
          ellipsePoints={ellipsePoints}
          vectorOpacity={svConfidence}
          vectors={[
            { vec: Av1, color: COLOR_V1, label: `σ₁u₁` },
            { vec: Av2, color: COLOR_V2, label: `σ₂u₂` },
          ]}
        />
      </svg>

      <div class={styles.legend}>
        <span>
          Right singular vectors v₁, v₂ on the unit circle (left) map to σᵢuᵢ on the image ellipse (right).
        </span>
      </div>
    </div>
  );
}
