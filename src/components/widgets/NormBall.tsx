import { useMemo, useState } from 'preact/hooks';

const W = 360;
const H = 360;
const PAD = 24;
const VIEW = 1.6; // world coords go from -VIEW to +VIEW

const cx = W / 2;
const cy = H / 2;
const scale = (W / 2 - PAD) / VIEW;

const sx = (x: number) => cx + x * scale;
const sy = (y: number) => cy - y * scale;

function ballPath(p: number, isInf: boolean): string {
  if (isInf) {
    // Exact square with vertices at (±1, ±1)
    return `M ${sx(1)} ${sy(1)} L ${sx(-1)} ${sy(1)} L ${sx(-1)} ${sy(-1)} L ${sx(1)} ${sy(-1)} Z`;
  }
  const steps = 360;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const denom = Math.pow(Math.pow(Math.abs(ct), p) + Math.pow(Math.abs(st), p), 1 / p);
    const r = 1 / denom;
    const x = r * ct;
    const y = r * st;
    pts.push(`${i === 0 ? 'M' : 'L'} ${sx(x).toFixed(2)} ${sy(y).toFixed(2)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

// Diagonal extent: r(π/4) where unit ball's boundary crosses the line y = x.
// For ℓ^p in 2D, this is 2^(1/2 - 1/p).
function diagonalExtent(p: number, isInf: boolean): number {
  if (isInf) return Math.sqrt(2);
  return Math.pow(2, 0.5 - 1 / p);
}

// Downward extent of the unit ball at horizontal world position x:
// the largest |y| such that (x, y) lies in the ball.
function ballYExtent(p: number, isInf: boolean, x: number): number {
  const ax = Math.abs(x);
  if (isInf) return ax <= 1 ? 1 : 0;
  if (ax >= 1) return 0;
  const remainder = 1 - Math.pow(ax, p);
  return remainder > 0 ? Math.pow(remainder, 1 / p) : 0;
}

export default function NormBall() {
  const [p, setP] = useState(2);
  const [isInf, setIsInf] = useState(false);

  const effectiveP = isInf ? Infinity : p;
  const d = useMemo(() => ballPath(p, isInf), [p, isInf]);
  const diag = diagonalExtent(p, isInf);

  // Convex (p ≥ 1) vs not (p < 1)
  const isConvex = isInf || p >= 1;

  const preset = (target: number, inf = false) => {
    setIsInf(inf);
    if (!inf) setP(target);
  };

  // Axis ticks at integer values within view
  const ticks = [-1, 1];

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
          display: 'flex',
          gap: '0.75rem 1.5rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          fontSize: '0.95em',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '1 1 220px',
          }}
        >
          <em>p</em>
          <input
            type="range"
            min="0.4"
            max="5"
            step="0.05"
            value={isInf ? 5 : p}
            disabled={isInf}
            onInput={(e) => {
              setIsInf(false);
              setP(parseFloat(e.currentTarget.value));
            }}
            style={{ flex: 1, accentColor: 'var(--sl-color-accent)' }}
          />
        </label>
        <span>
          <em>p</em> ={' '}
          <strong>{isInf ? '∞' : p.toFixed(2)}</strong>
        </span>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {[
            { label: 'p = 1', onClick: () => preset(1) },
            { label: 'p = 2', onClick: () => preset(2) },
            { label: 'p = ∞', onClick: () => preset(0, true) },
          ].map((b) => (
            <button
              onClick={b.onClick}
              style={{
                width: '4.5rem',
                height: '1.8rem',
                padding: 0,
                margin: 0,
                borderRadius: '3px',
                border: '1px solid var(--sl-color-gray-5)',
                background: 'var(--sl-color-bg)',
                color: 'inherit',
                fontFamily: 'inherit',
                fontSize: '0.85em',
                lineHeight: 1,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                verticalAlign: 'middle',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '-0.5rem',
          marginBottom: '0.75rem',
          fontSize: '0.85em',
          color: isConvex ? 'var(--sl-color-text-accent)' : '#e11d48',
          fontWeight: 600,
        }}
      >
        {isConvex ? 'convex (valid norm)' : 'non-convex (triangle inequality fails)'}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block', margin: '0 auto' }}
        aria-label={`Unit ball of the ℓ^${isInf ? 'infinity' : p.toFixed(2)} norm in 2D`}
        shape-rendering="geometricPrecision"
      >
        {/* Reference ℓ² circle (faint) for comparison */}
        <circle
          cx={cx}
          cy={cy}
          r={scale}
          fill="none"
          stroke="currentColor"
          stroke-opacity="0.18"
          stroke-dasharray="3 3"
        />

        {/* Axes */}
        <line
          x1={sx(-VIEW)}
          y1={cy}
          x2={sx(VIEW)}
          y2={cy}
          stroke="currentColor"
          stroke-opacity="0.4"
        />
        <line
          x1={cx}
          y1={sy(-VIEW)}
          x2={cx}
          y2={sy(VIEW)}
          stroke="currentColor"
          stroke-opacity="0.4"
        />
        {ticks.map((t) => (
          <g>
            {/* x-axis tick + label (label sits at the tick, just past x = ±1 on the axis line) */}
            <line
              x1={sx(t)}
              y1={cy - 3}
              x2={sx(t)}
              y2={cy + 3}
              stroke="currentColor"
              stroke-opacity="0.5"
            />
            <text
              x={sx(t * 1.08)}
              y={cy}
              text-anchor={t > 0 ? 'start' : 'end'}
              dominant-baseline="middle"
              font-size="11"
              fill="currentColor"
              fill-opacity="0.7"
            >
              {t}
            </text>
            {/* y-axis tick + label (label sits at the tick, just past y = ±1 on the axis line) */}
            <line
              x1={cx - 3}
              y1={sy(t)}
              x2={cx + 3}
              y2={sy(t)}
              stroke="currentColor"
              stroke-opacity="0.5"
            />
            <text
              x={cx}
              y={sy(t * 1.08)}
              text-anchor="middle"
              dominant-baseline={t > 0 ? 'auto' : 'hanging'}
              font-size="11"
              fill="currentColor"
              fill-opacity="0.7"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Unit ball */}
        <path
          d={d}
          fill="var(--sl-color-accent)"
          fill-opacity="0.18"
          stroke="var(--sl-color-accent)"
          stroke-width="2"
          stroke-linejoin="round"
        />

        {/* Mark the diagonal point (1/√2, 1/√2) * 2^(1/2 - 1/p) */}
        <g>
          <line
            x1={cx}
            y1={cy}
            x2={sx(diag / Math.sqrt(2))}
            y2={sy(diag / Math.sqrt(2))}
            stroke="#e11d48"
            stroke-width="1.5"
            stroke-opacity="0.85"
            stroke-dasharray="4 3"
          />
          <circle
            cx={sx(diag / Math.sqrt(2))}
            cy={sy(diag / Math.sqrt(2))}
            r="3.5"
            fill="#e11d48"
          />
          <text
            x={sx(diag / Math.sqrt(2)) + 6}
            y={sy(diag / Math.sqrt(2)) - 6}
            font-size="11"
            fill="#e11d48"
            font-weight="600"
          >
            r = {diag.toFixed(3)}
          </text>
        </g>
      </svg>

      <div
        style={{
          marginTop: '0.75rem',
          fontSize: '0.85em',
          color: 'var(--sl-color-text)',
          textAlign: 'center',
        }}
      >
        <em>r</em> = distance from origin to ball boundary along the diagonal
        <em> y = x </em>
        (equals <strong>2<sup>1/2 − 1/p</sup></strong>)
      </div>
    </div>
  );
}
