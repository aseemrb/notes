import { useMemo, useState } from 'preact/hooks';
import { distributions, distKeys, type DistKey } from './distributions';
import styles from './widget.module.css';

const W = 600;
const H = 320;
const PAD = { left: 52, right: 16, top: 14, bottom: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const MAX_PATHS = 5;
const MAX_SAMPLES = 1000; // matches the maxN slider's upper bound

const PATH_COLORS = [
  'var(--sl-color-accent)',
  '#e11d48',
  '#16a34a',
  '#d97706',
  '#7c3aed',
];

export default function SLLNRunningAverage() {
  const [distKey, setDistKey] = useState<DistKey>('uniform');
  const [maxN, setMaxN] = useState(500);
  const [numPaths, setNumPaths] = useState(3);
  const [seed, setSeed] = useState(0);

  // Sample cache: full-length sequences for the chosen distribution.
  // Re-generated only when distKey or seed changes, so dragging the
  // maxN / numPaths sliders never reshuffles random numbers and stays live.
  const sampleCache = useMemo(() => {
    const dist = distributions[distKey];
    const arrays: Float64Array[] = [];
    for (let p = 0; p < MAX_PATHS; p++) {
      const arr = new Float64Array(MAX_SAMPLES);
      for (let i = 0; i < MAX_SAMPLES; i++) arr[i] = dist.sample();
      arrays.push(arr);
    }
    return arrays;
  }, [distKey, seed]);

  // Cheap derivation: slice the cache and compute running averages.
  const { paths, mean, yMin, yMax } = useMemo(() => {
    const dist = distributions[distKey];
    const paths: Float64Array[] = [];
    let pathMin = Infinity;
    let pathMax = -Infinity;
    for (let p = 0; p < numPaths; p++) {
      const samples = sampleCache[p];
      const path = new Float64Array(maxN);
      let sum = 0;
      for (let i = 0; i < maxN; i++) {
        sum += samples[i];
        const avg = sum / (i + 1);
        path[i] = avg;
        if (avg < pathMin) pathMin = avg;
        if (avg > pathMax) pathMax = avg;
      }
      paths.push(path);
    }
    const span = Math.max(pathMax - dist.mean, dist.mean - pathMin, 0.1);
    return {
      paths,
      mean: dist.mean,
      yMin: dist.mean - span * 1.05,
      yMax: dist.mean + span * 1.05,
    };
  }, [sampleCache, distKey, maxN, numPaths]);

  function xScale(n: number): number {
    return PAD.left + ((n - 1) / Math.max(maxN - 1, 1)) * PLOT_W;
  }
  function yScale(y: number): number {
    return PAD.top + PLOT_H - ((y - yMin) / (yMax - yMin)) * PLOT_H;
  }

  function pathToPolyline(path: Float64Array): string {
    const pts: string[] = [];
    // Downsample for very long paths to keep the DOM small
    const stride = Math.max(1, Math.floor(maxN / 800));
    for (let i = 0; i < path.length; i += stride) {
      pts.push(`${xScale(i + 1).toFixed(2)},${yScale(path[i]).toFixed(2)}`);
    }
    // Always include the last point
    pts.push(`${xScale(path.length).toFixed(2)},${yScale(path[path.length - 1]).toFixed(2)}`);
    return pts.join(' ');
  }

  // Tick generation
  const xTickStep =
    maxN >= 1500 ? 500 : maxN >= 800 ? 250 : maxN >= 400 ? 100 : 50;
  const xTicks: number[] = [];
  for (let t = 0; t <= maxN; t += xTickStep) xTicks.push(t);
  if (xTicks[xTicks.length - 1] !== maxN) xTicks.push(maxN);

  const yTickStep = niceStep((yMax - yMin) / 4);
  const yTicks: number[] = [];
  const yStart = Math.ceil(yMin / yTickStep) * yTickStep;
  for (let t = yStart; t <= yMax; t += yTickStep) yTicks.push(t);

  return (
    <div class={styles.widget}>
      <div class={styles.controls}>
        <div class={styles.controlGroup}>
          <label class={styles.controlLabel} for="slln-dist">Distribution</label>
          <select
            id="slln-dist"
            class={styles.select}
            value={distKey}
            onChange={(e) => setDistKey(e.currentTarget.value as DistKey)}
          >
            {distKeys.map((k) => (
              <option value={k}>{distributions[k].label}</option>
            ))}
          </select>
        </div>

        <div class={styles.controlGroup}>
          <label class={styles.controlLabel} for="slln-n">
            max n = <span class={styles.controlValue}>{maxN}</span>
          </label>
          <input
            id="slln-n"
            class={styles.slider}
            type="range"
            min="10"
            max="1000"
            step="10"
            value={maxN}
            onInput={(e) => setMaxN(parseInt(e.currentTarget.value, 10))}
          />
        </div>

        <div class={styles.controlGroup}>
          <label class={styles.controlLabel} for="slln-paths">
            paths = <span class={styles.controlValue}>{numPaths}</span>
          </label>
          <input
            id="slln-paths"
            class={styles.slider}
            type="range"
            min="1"
            max="5"
            step="1"
            value={numPaths}
            onInput={(e) => setNumPaths(parseInt(e.currentTarget.value, 10))}
          />
        </div>

        <div class={styles.controlGroup}>
          <span class={styles.controlLabel}>&nbsp;</span>
          <button class={styles.button} onClick={() => setSeed((s) => s + 1)}>
            Resample
          </button>
        </div>
      </div>

      <svg
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Running sample average vs n, ${numPaths} paths`}
        shape-rendering="geometricPrecision"
      >
        {/* True mean line */}
        <line
          x1={PAD.left}
          y1={yScale(mean)}
          x2={PAD.left + PLOT_W}
          y2={yScale(mean)}
          stroke="currentColor"
          stroke-dasharray="4 4"
          stroke-opacity="0.5"
        />

        {/* Paths */}
        {paths.map((path, i) => (
          <polyline
            points={pathToPolyline(path)}
            fill="none"
            stroke={PATH_COLORS[i % PATH_COLORS.length]}
            stroke-width="1.5"
            stroke-opacity="0.85"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        ))}

        {/* X-axis */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="currentColor"
        />
        {xTicks.map((t) => (
          <g>
            <line
              x1={xScale(t || 1)}
              y1={PAD.top + PLOT_H}
              x2={xScale(t || 1)}
              y2={PAD.top + PLOT_H + 4}
              stroke="currentColor"
            />
            <text
              x={xScale(t || 1)}
              y={PAD.top + PLOT_H + 18}
              text-anchor="middle"
              font-size="12"
              fill="currentColor"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Y-axis */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + PLOT_H}
          stroke="currentColor"
        />
        {yTicks.map((t) => (
          <g>
            <line
              x1={PAD.left - 4}
              y1={yScale(t)}
              x2={PAD.left}
              y2={yScale(t)}
              stroke="currentColor"
            />
            <text
              x={PAD.left - 8}
              y={yScale(t) + 4}
              text-anchor="end"
              font-size="12"
              fill="currentColor"
            >
              {formatTick(t)}
            </text>
          </g>
        ))}

        {/* μ label on the dashed line */}
        <text
          x={PAD.left + PLOT_W - 4}
          y={yScale(mean) - 4}
          text-anchor="end"
          font-size="12"
          fill="currentColor"
          fill-opacity="0.75"
        >
          μ = {formatTick(mean)}
        </text>

        {/* Axis labels */}
        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 4}
          text-anchor="middle"
          font-size="12"
          fill="currentColor"
        >
          n
        </text>
      </svg>

      <div class={styles.legend}>
        <span>
          Each colored line is the running average X̄_n of one i.i.d. sequence.
        </span>
        <span style="margin-left:auto;">
          dashed = true mean μ
        </span>
      </div>
    </div>
  );
}

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  let nice: number;
  if (norm < 1.5) nice = 1;
  else if (norm < 3) nice = 2;
  else if (norm < 7) nice = 5;
  else nice = 10;
  return nice * pow;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}
