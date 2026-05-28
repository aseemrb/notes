import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Gradient descent on a 2D loss surface. Pick a loss preset (bowl, ill-conditioned
// ellipse, saddle, Rosenbrock), pick an optimizer (GD / Momentum / SGD), set the
// learning rate (and momentum or noise), then Step or Animate. The heatmap is the
// loss value (dark = high); click anywhere on the surface to relaunch from there.

const N = 240;
const W = 320;
const H = 320;
const MAX_ITERS = 250;
const ACCENT = 'var(--sl-color-accent)';

type V = { x: number; y: number };

type Preset = {
  key: string;
  label: string;
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => V;
  view: { xmin: number; xmax: number; ymin: number; ymax: number };
  defaultLR: number;
  start: V;
  minimum?: V;
};

const PRESETS: Preset[] = [
  {
    key: 'bowl',
    label: 'Bowl',
    f: (x, y) => 0.5 * (x * x + y * y),
    grad: (x, y) => ({ x, y }),
    view: { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5 },
    defaultLR: 0.2,
    start: { x: -2, y: 1.8 },
    minimum: { x: 0, y: 0 },
  },
  {
    key: 'ellipse',
    label: 'Ellipse',
    f: (x, y) => 0.5 * (x * x + 25 * y * y),
    grad: (x, y) => ({ x, y: 25 * y }),
    view: { xmin: -2.5, xmax: 2.5, ymin: -1, ymax: 1 },
    defaultLR: 0.05,
    start: { x: -2.2, y: 0.7 },
    minimum: { x: 0, y: 0 },
  },
  {
    key: 'saddle',
    label: 'Saddle',
    f: (x, y) => 0.5 * (x * x - y * y),
    grad: (x, y) => ({ x, y: -y }),
    view: { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5 },
    defaultLR: 0.15,
    start: { x: -2, y: 0.02 },
  },
  {
    key: 'rosen',
    label: 'Rosenbrock',
    f: (x, y) => (1 - x) * (1 - x) + 10 * (y - x * x) * (y - x * x),
    grad: (x, y) => ({
      x: -2 * (1 - x) - 40 * x * (y - x * x),
      y: 20 * (y - x * x),
    }),
    view: { xmin: -1.5, xmax: 2, ymin: -0.5, ymax: 2 },
    defaultLR: 0.005,
    start: { x: -1, y: 1.5 },
    minimum: { x: 1, y: 1 },
  },
];

const ALGOS = ['GD', 'Momentum', 'SGD'] as const;
type Algo = (typeof ALGOS)[number];

function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeHeatmap(p: Preset): string {
  const canvas = document.createElement('canvas');
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(N, N);
  const { xmin, xmax, ymin, ymax } = p.view;
  const vals = new Float64Array(N * N);
  let fmin = Infinity;
  let fmax = -Infinity;
  for (let r = 0; r < N; r++) {
    const y = ymax - (r / (N - 1)) * (ymax - ymin);
    for (let c = 0; c < N; c++) {
      const x = xmin + (c / (N - 1)) * (xmax - xmin);
      const v = p.f(x, y);
      vals[r * N + c] = v;
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }
  }
  const span = Math.max(1e-9, Math.log1p(fmax - fmin));
  for (let i = 0; i < N * N; i++) {
    const t = Math.log1p(vals[i] - fmin) / span;
    const g = Math.round(255 * (1 - 0.65 * t));
    img.data[4 * i] = g;
    img.data[4 * i + 1] = g;
    img.data[4 * i + 2] = g;
    img.data[4 * i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export default function GradientDescent() {
  const [presetKey, setPresetKey] = useState('bowl');
  const [algo, setAlgo] = useState<Algo>('GD');
  const preset = PRESETS.find((p) => p.key === presetKey)!;
  const [eta, setEta] = useState(preset.defaultLR);
  const [beta, setBeta] = useState(0.9);
  const [sigma, setSigma] = useState(0.3);
  const [iter, setIter] = useState<V[]>([preset.start]);
  const velRef = useRef<V>({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(false);
  const stepRef = useRef<() => void>(() => {});

  const [url, setUrl] = useState('');

  // reset on preset change (and recompute heatmap on the client)
  useEffect(() => {
    setIter([preset.start]);
    velRef.current = { x: 0, y: 0 };
    setEta(preset.defaultLR);
    setPlaying(false);
    setUrl(makeHeatmap(preset));
  }, [presetKey]);

  const px = (x: number) => ((x - preset.view.xmin) / (preset.view.xmax - preset.view.xmin)) * W;
  const py = (y: number) => H - ((y - preset.view.ymin) / (preset.view.ymax - preset.view.ymin)) * H;

  stepRef.current = () => {
    setIter((cur) => {
      if (cur.length > MAX_ITERS) return cur;
      const last = cur[cur.length - 1];
      const g = preset.grad(last.x, last.y);
      let next: V;
      if (algo === 'Momentum') {
        const v = { x: beta * velRef.current.x - eta * g.x, y: beta * velRef.current.y - eta * g.y };
        velRef.current = v;
        next = { x: last.x + v.x, y: last.y + v.y };
      } else if (algo === 'SGD') {
        next = { x: last.x - eta * (g.x + sigma * gauss()), y: last.y - eta * (g.y + sigma * gauss()) };
      } else {
        next = { x: last.x - eta * g.x, y: last.y - eta * g.y };
      }
      const v = preset.view;
      next.x = Math.max(v.xmin, Math.min(v.xmax, next.x));
      next.y = Math.max(v.ymin, Math.min(v.ymax, next.y));
      return [...cur, next];
    });
  };

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => stepRef.current(), 110);
    return () => clearInterval(id);
  }, [playing]);

  function onSvgClick(e: MouseEvent) {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * W;
    const sy = ((e.clientY - rect.top) / rect.height) * H;
    const x = preset.view.xmin + (sx / W) * (preset.view.xmax - preset.view.xmin);
    const y = preset.view.ymin + ((H - sy) / H) * (preset.view.ymax - preset.view.ymin);
    setIter([{ x, y }]);
    velRef.current = { x: 0, y: 0 };
  }

  const last = iter[iter.length - 1];
  const fVal = preset.f(last.x, last.y);
  const poly = iter.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          {PRESETS.map((p) => (
            <button
              class={styles.button}
              style={presetKey === p.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
              onClick={() => setPresetKey(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div class={styles.controlRow}>
          {ALGOS.map((a) => (
            <button
              class={styles.button}
              style={algo === a ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
              onClick={() => setAlgo(a)}
            >
              {a}
            </button>
          ))}
          <button class={styles.button} onClick={() => { setPlaying(false); stepRef.current(); }}>Step</button>
          <button
            class={styles.button}
            style={playing ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
            onClick={() => setPlaying((p) => !p)}
          >
            {playing ? 'Pause' : 'Animate'}
          </button>
          <button
            class={styles.button}
            onClick={() => {
              setIter([preset.start]);
              velRef.current = { x: 0, y: 0 };
              setPlaying(false);
            }}
          >
            Reset
          </button>
        </div>
        <div class={styles.controls} style={{ padding: 0, border: 'none', background: 'none', margin: 0 }}>
          <div class={styles.controlGroup}>
            <label class={styles.controlLabel}>
              learning rate η = <span class={styles.controlValue}>{eta.toFixed(3)}</span>
            </label>
            <input
              class={styles.slider}
              type="range"
              min="0.001"
              max="0.5"
              step="0.001"
              value={eta}
              onInput={(e) => setEta(parseFloat(e.currentTarget.value))}
            />
          </div>
          {algo === 'Momentum' && (
            <div class={styles.controlGroup}>
              <label class={styles.controlLabel}>
                momentum β = <span class={styles.controlValue}>{beta.toFixed(2)}</span>
              </label>
              <input
                class={styles.slider}
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                value={beta}
                onInput={(e) => setBeta(parseFloat(e.currentTarget.value))}
              />
            </div>
          )}
          {algo === 'SGD' && (
            <div class={styles.controlGroup}>
              <label class={styles.controlLabel}>
                noise σ = <span class={styles.controlValue}>{sigma.toFixed(2)}</span>
              </label>
              <input
                class={styles.slider}
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={sigma}
                onInput={(e) => setSigma(parseFloat(e.currentTarget.value))}
              />
            </div>
          )}
        </div>
      </div>

      <svg
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        style={{ cursor: 'crosshair', maxWidth: '420px' }}
        onClick={onSvgClick}
        role="img"
        aria-label="Gradient descent on a 2D loss surface; click to relaunch"
      >
        <image href={url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
        {preset.minimum && (
          <circle
            cx={px(preset.minimum.x)}
            cy={py(preset.minimum.y)}
            r="6"
            fill="none"
            stroke={ACCENT}
            stroke-width="1.6"
            stroke-opacity="0.8"
          />
        )}
        <polyline points={poly} fill="none" stroke={ACCENT} stroke-width="1.6" stroke-opacity="0.9" />
        <circle cx={px(last.x)} cy={py(last.y)} r="5" fill={ACCENT} />
      </svg>

      <div class={styles.legend}>
        <span>
          step <strong>{iter.length - 1}</strong>; current loss f = <strong>{fVal.toFixed(3)}</strong>. The dashed circle marks
          the true minimum where one exists. Click anywhere on the surface to set a new starting point.
        </span>
      </div>
    </div>
  );
}
