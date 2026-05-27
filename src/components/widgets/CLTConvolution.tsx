import { useMemo, useState } from 'preact/hooks';

interface DiscreteDistribution {
  type: 'discrete';
  key: string;
  label: string;
  p: number[]; // PMF values starting at the offset
  offset: number; // integer at which p[0] lives
}

interface ContinuousDistribution {
  type: 'continuous';
  key: string;
  label: string;
  // Density of the n-fold sum, evaluated at x.
  density: (x: number, n: number) => number;
  // Support lower bound (typically 0 for positive distributions).
  supportMin: number;
  mean: number;
  variance: number;
}

type BaseDistribution = DiscreteDistribution | ContinuousDistribution;

// Lanczos approximation to log Γ(z), accurate to ~1e-15 for z > 0.
function lgamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  let a = c[0];
  const t = z + g + 0.5;
  for (let i = 1; i < c.length; i++) a += c[i] / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

// Density of Gamma(n, 1) = sum of n i.i.d. Exp(1): x^{n-1} e^{-x} / Γ(n).
function gammaDensity(x: number, n: number): number {
  if (x <= 0 || n < 1) return 0;
  return Math.exp((n - 1) * Math.log(x) - x - lgamma(n));
}

const DISTRIBUTIONS: BaseDistribution[] = [
  {
    type: 'discrete',
    key: 'bernoulli',
    label: 'Binomial(n, 0.3)',
    p: [0.7, 0.3],
    offset: 0,
  },
  {
    type: 'discrete',
    key: 'die',
    label: 'Uniform die',
    p: [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6],
    offset: 1,
  },
  {
    type: 'continuous',
    key: 'exponential',
    label: 'Gamma(n, 1)',
    density: gammaDensity,
    supportMin: 0,
    mean: 1,
    variance: 1,
  },
  {
    type: 'discrete',
    key: 'bimodal',
    label: 'bimodal',
    p: [0.45, 0.1, 0.45],
    offset: 0,
  },
];

function convolve(p: number[], q: number[]): number[] {
  const n = p.length;
  const m = q.length;
  const out = new Array(n + m - 1).fill(0) as number[];
  for (let i = 0; i < n; i++) {
    if (p[i] === 0) continue;
    for (let j = 0; j < m; j++) out[i + j] += p[i] * q[j];
  }
  return out;
}

function nfold(p: number[], n: number): number[] {
  let r: number[] = [1];
  for (let i = 0; i < n; i++) r = convolve(r, p);
  return r;
}

function momentsDiscrete(p: number[], offset: number) {
  let mean = 0;
  for (let i = 0; i < p.length; i++) mean += (i + offset) * p[i];
  let v = 0;
  for (let i = 0; i < p.length; i++) {
    const x = i + offset - mean;
    v += x * x * p[i];
  }
  return { mean, var: v, std: Math.sqrt(v) };
}

const W = 720;
const H = 300;
const PAD = { left: 50, right: 20, top: 20, bottom: 50 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const DENSITY_STEPS = 300;

export default function CLTConvolution() {
  const [distKey, setDistKey] = useState('bernoulli');
  const [n, setN] = useState(1);

  const dist = DISTRIBUTIONS.find((d) => d.key === distKey)!;

  // Base moments depend only on the distribution choice, not on n.
  const baseM = useMemo(() => {
    if (dist.type === 'discrete') return momentsDiscrete(dist.p, dist.offset);
    return {
      mean: dist.mean,
      var: dist.variance,
      std: Math.sqrt(dist.variance),
    };
  }, [distKey]);

  const sumM = {
    mean: n * baseM.mean,
    var: n * baseM.var,
    std: Math.sqrt(n * baseM.var),
  };

  // Determine the x-axis range: zoom into [mean − 4σ, mean + 4σ], clipped
  // to the support of the sum.
  let xMin: number, xMax: number;
  if (dist.type === 'discrete') {
    const sumOffset = n * dist.offset;
    const supportLen = n * (dist.p.length - 1) + 1;
    const supportMin = sumOffset;
    const supportMax = sumOffset + supportLen - 1;
    xMin = Math.floor(sumM.mean - 4 * sumM.std);
    xMax = Math.ceil(sumM.mean + 4 * sumM.std);
    if (xMin < supportMin) xMin = supportMin;
    if (xMax > supportMax) xMax = supportMax;
    if (xMax - xMin < 4) {
      xMin = supportMin;
      xMax = supportMax;
    }
  } else {
    xMin = Math.max(dist.supportMin, sumM.mean - 4 * sumM.std);
    xMax = sumM.mean + 4 * sumM.std;
    if (xMax - xMin < 4 * sumM.std) xMax = xMin + 4 * sumM.std;
  }

  // Build the exact-distribution data (bars for discrete, smooth curve for continuous)
  // and track its peak so we can scale the y-axis.
  let maxP = 0;
  const bars: { x: number; y: number; w: number; h: number }[] = [];
  let densityPathFwd = ''; // top of the curve (left → right)
  let densityValues: { x: number; y: number }[] = []; // for filling under the curve

  if (dist.type === 'discrete') {
    const sumP = nfold(dist.p, n);
    const sumOffset = n * dist.offset;
    for (let x = xMin; x <= xMax; x++) {
      const i = x - sumOffset;
      if (i >= 0 && i < sumP.length && sumP[i] > maxP) maxP = sumP[i];
    }
    // Defer bar pixel positions until we know yMax.
    const nBars = xMax - xMin + 1;
    const barW = Math.min((PLOT_W / nBars) * 0.9, 28);
    for (let x = xMin; x <= xMax; x++) {
      const i = x - sumOffset;
      if (i < 0 || i >= sumP.length) continue;
      const py = sumP[i];
      if (py < 1e-12) continue;
      bars.push({ x, y: py, w: barW, h: 0 });
    }
  } else {
    for (let k = 0; k <= DENSITY_STEPS; k++) {
      const xx = xMin + (k / DENSITY_STEPS) * (xMax - xMin);
      const dy = dist.density(xx, n);
      if (dy > maxP) maxP = dy;
      densityValues.push({ x: xx, y: dy });
    }
  }

  const gaussPeak =
    sumM.std > 0 ? 1 / (sumM.std * Math.sqrt(2 * Math.PI)) : 0;
  let yMax = Math.max(maxP, gaussPeak) * 1.08;
  if (yMax === 0) yMax = 1;

  const xPx = (x: number) =>
    PAD.left + ((x - xMin) / (xMax - xMin)) * PLOT_W;
  const yPx = (y: number) => H - PAD.bottom - (y / yMax) * PLOT_H;

  // Now finalize geometry that needed yMax.
  if (dist.type === 'discrete') {
    for (const b of bars) {
      const bx = xPx(b.x) - b.w / 2;
      const by = yPx(b.y);
      b.x = bx;
      b.y = by;
      b.h = H - PAD.bottom - by;
    }
  } else {
    const pts: string[] = [];
    for (let k = 0; k < densityValues.length; k++) {
      const { x, y } = densityValues[k];
      pts.push(`${k === 0 ? 'M' : 'L'}${xPx(x).toFixed(2)},${yPx(y).toFixed(2)}`);
    }
    densityPathFwd = pts.join(' ');
  }

  let gaussPath = '';
  if (sumM.std > 0) {
    const steps = 240;
    for (let k = 0; k <= steps; k++) {
      const xx = xMin + (k / steps) * (xMax - xMin);
      const g =
        Math.exp(-((xx - sumM.mean) ** 2) / (2 * sumM.var)) /
        (sumM.std * Math.sqrt(2 * Math.PI));
      gaussPath += `${k === 0 ? 'M' : 'L'}${xPx(xx).toFixed(1)},${yPx(g).toFixed(1)} `;
    }
  }

  const stdTicks: { x: number; label: string }[] = [];
  for (let k = -3; k <= 3; k++) {
    const x = sumM.mean + k * sumM.std;
    if (x < xMin || x > xMax) continue;
    stdTicks.push({ x, label: x.toFixed(1) });
  }

  return (
    <div
      class="not-content"
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select
            value={distKey}
            onChange={(e) => setDistKey(e.currentTarget.value)}
            style={{
              padding: '0.2rem 0.4rem',
              background: 'var(--sl-color-bg)',
              color: 'inherit',
              border: '1px solid currentColor',
              borderRadius: '3px',
              font: 'inherit',
            }}
          >
            {DISTRIBUTIONS.map((d) => (
              <option value={d.key}>{d.label}</option>
            ))}
          </select>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flex: '1 1 200px',
          }}
        >
          <em>n</em>
          <input
            type="range"
            min="1"
            max="40"
            step="1"
            value={n}
            onInput={(e) => setN(parseInt(e.currentTarget.value, 10))}
            style={{ flex: 1, accentColor: 'var(--sl-color-accent)' }}
          />
        </label>
        <span>
          <em>n</em> = <strong>{n}</strong>
        </span>
        <span>
          <em>
            μ<sub>n</sub>
          </em>{' '}
          = <strong>{sumM.mean.toFixed(2)}</strong>
        </span>
        <span>
          <em>
            σ<sub>n</sub>
          </em>{' '}
          = <strong>{sumM.std.toFixed(2)}</strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto' }}
        aria-label="Distribution of the n-fold sum with a Gaussian overlay"
        shape-rendering="geometricPrecision"
      >
        {/* Axes */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="currentColor"
          stroke-opacity="0.3"
          stroke-width="0.7"
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={H - PAD.bottom}
          stroke="currentColor"
          stroke-opacity="0.3"
          stroke-width="0.7"
        />

        {/* Exact distribution: bars (discrete) or filled smooth curve (continuous) */}
        {dist.type === 'discrete' &&
          bars.map((b) => (
            <rect
              x={b.x.toFixed(2)}
              y={b.y.toFixed(2)}
              width={b.w.toFixed(2)}
              height={b.h.toFixed(2)}
              fill="var(--sl-color-accent)"
              fill-opacity="0.7"
            />
          ))}
        {dist.type === 'continuous' && densityPathFwd && (
          <path
            d={
              densityPathFwd +
              ` L${xPx(xMax).toFixed(2)},${yPx(0).toFixed(2)}` +
              ` L${xPx(xMin).toFixed(2)},${yPx(0).toFixed(2)} Z`
            }
            fill="var(--sl-color-accent)"
            fill-opacity="0.55"
            stroke="var(--sl-color-accent)"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        )}

        {/* Gaussian fit */}
        {gaussPath && (
          <path
            d={gaussPath}
            stroke="#dc2626"
            stroke-width="2"
            fill="none"
            stroke-dasharray="5 3"
            stroke-opacity="0.85"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        )}

        {/* mean ± k σ tick marks */}
        {stdTicks.map((t) => (
          <g>
            <line
              x1={xPx(t.x)}
              y1={H - PAD.bottom}
              x2={xPx(t.x)}
              y2={H - PAD.bottom + 4}
              stroke="currentColor"
              stroke-opacity="0.4"
            />
            <text
              x={xPx(t.x)}
              y={H - PAD.bottom + 18}
              text-anchor="middle"
              font-size="11"
              fill="currentColor"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={W / 2}
          y={H - 8}
          text-anchor="middle"
          font-size="12"
          font-style="italic"
          fill="currentColor"
        >
          sum value
        </text>
        <text
          x="14"
          y={H / 2}
          text-anchor="middle"
          font-size="12"
          font-style="italic"
          fill="currentColor"
          transform={`rotate(-90 14 ${H / 2})`}
        >
          {dist.type === 'continuous' ? 'density' : 'probability'}
        </text>

        {/* In-plot legend */}
        <g
          transform={`translate(${W - PAD.right - 130}, ${PAD.top + 4})`}
          font-size="11"
          fill="currentColor"
        >
          <rect
            x="0"
            y="0"
            width="130"
            height="38"
            fill="var(--sl-color-bg)"
            stroke="currentColor"
            stroke-opacity="0.25"
            rx="3"
          />
          <rect
            x="8"
            y="10"
            width="14"
            height="8"
            fill="var(--sl-color-accent)"
            fill-opacity="0.7"
          />
          <text x="28" y="17">exact sum</text>
          <line x1="8" y1="30" x2="22" y2="30" stroke="#dc2626" stroke-width="2" stroke-dasharray="5 3" />
          <text x="28" y="33">Gaussian fit</text>
        </g>
      </svg>
    </div>
  );
}
