import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Gradient descent on a 2D loss surface. Pick a loss preset (bowl, ill-conditioned
// ellipse, saddle, Rosenbrock), pick an optimizer (GD / Momentum / SGD), set the
// learning rate (and momentum or noise), then Step or Animate. The surface is drawn
// as a viridis colormap (bright = low loss, dark = high loss) with topographic
// contour lines; click anywhere to relaunch from there.

const N = 240; // colormap resolution
const GW = 96; // contour grid resolution
const W = 340;
const H = 340;
const MAX_ITERS = 300;
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

// viridis anchors; t in [0,1] -> [r,g,b]. t=0 dark purple, t=1 bright yellow.
const VIRIDIS = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];
function cmap(t: number): [number, number, number] {
  const tt = Math.max(0, Math.min(1, t)) * (VIRIDIS.length - 1);
  const i = Math.floor(tt);
  const f = tt - i;
  const a = VIRIDIS[i];
  const b = VIRIDIS[Math.min(i + 1, VIRIDIS.length - 1)];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

type Surface = { url: string; contours: string[] };

// Marching squares: build one SVG path (line segments) for the iso-line at `level`
// of the normalized grid (values in [0,1], row 0 = top = ymax).
function contourPath(grid: Float64Array, level: number): string {
  let d = '';
  const sx = (c: number) => (c / (GW - 1)) * W;
  const sy = (r: number) => (r / (GW - 1)) * H;
  const g = (c: number, r: number) => grid[r * GW + c];
  for (let r = 0; r < GW - 1; r++) {
    for (let c = 0; c < GW - 1; c++) {
      const tl = g(c, r);
      const tr = g(c + 1, r);
      const br = g(c + 1, r + 1);
      const bl = g(c, r + 1);
      let idx = 0;
      if (tl >= level) idx |= 8;
      if (tr >= level) idx |= 4;
      if (br >= level) idx |= 2;
      if (bl >= level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const top = (): [number, number] => [sx(c + (level - tl) / (tr - tl)), sy(r)];
      const right = (): [number, number] => [sx(c + 1), sy(r + (level - tr) / (br - tr))];
      const bottom = (): [number, number] => [sx(c + (level - bl) / (br - bl)), sy(r + 1)];
      const left = (): [number, number] => [sx(c), sy(r + (level - tl) / (bl - tl))];
      const seg = (a: [number, number], b: [number, number]) => {
        d += `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
      };
      switch (idx) {
        case 1: seg(left(), bottom()); break;
        case 2: seg(bottom(), right()); break;
        case 3: seg(left(), right()); break;
        case 4: seg(top(), right()); break;
        case 5: seg(top(), right()); seg(left(), bottom()); break;
        case 6: seg(top(), bottom()); break;
        case 7: seg(top(), left()); break;
        case 8: seg(top(), left()); break;
        case 9: seg(top(), bottom()); break;
        case 10: seg(top(), left()); seg(bottom(), right()); break;
        case 11: seg(top(), right()); break;
        case 12: seg(left(), right()); break;
        case 13: seg(bottom(), right()); break;
        case 14: seg(left(), bottom()); break;
      }
    }
  }
  return d;
}

function makeSurface(p: Preset): Surface {
  const { xmin, xmax, ymin, ymax } = p.view;

  // coarse grid for normalization + contours
  const grid = new Float64Array(GW * GW);
  let fmin = Infinity;
  let fmax = -Infinity;
  for (let r = 0; r < GW; r++) {
    const y = ymax - (r / (GW - 1)) * (ymax - ymin);
    for (let c = 0; c < GW; c++) {
      const x = xmin + (c / (GW - 1)) * (xmax - xmin);
      const v = p.f(x, y);
      grid[r * GW + c] = v;
      if (v < fmin) fmin = v;
      if (v > fmax) fmax = v;
    }
  }
  const span = Math.max(1e-9, Math.log1p(fmax - fmin));
  for (let i = 0; i < grid.length; i++) grid[i] = Math.log1p(grid[i] - fmin) / span; // -> [0,1]

  // colormap canvas at full resolution
  let url = '';
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = N;
    canvas.height = N;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = ctx.createImageData(N, N);
      for (let r = 0; r < N; r++) {
        const y = ymax - (r / (N - 1)) * (ymax - ymin);
        for (let c = 0; c < N; c++) {
          const x = xmin + (c / (N - 1)) * (xmax - xmin);
          const norm = Math.log1p(p.f(x, y) - fmin) / span; // 0 low, 1 high
          const [cr, cg, cb] = cmap(1 - norm); // low loss -> bright
          const idx = 4 * (r * N + c);
          img.data[idx] = cr;
          img.data[idx + 1] = cg;
          img.data[idx + 2] = cb;
          img.data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      url = canvas.toDataURL();
    }
  }

  const contours: string[] = [];
  for (let i = 1; i <= 9; i++) contours.push(contourPath(grid, i / 10));
  return { url, contours };
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

  const [surface, setSurface] = useState<Surface>({ url: '', contours: [] });

  // reset on preset change (and recompute surface on the client)
  useEffect(() => {
    setIter([preset.start]);
    velRef.current = { x: 0, y: 0 };
    setEta(preset.defaultLR);
    setPlaying(false);
    setSurface(makeSurface(preset));
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
    setPlaying(false);
  }

  const last = iter[iter.length - 1];
  const fVal = preset.f(last.x, last.y);
  const poly = iter.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ');
  const showDots = iter.length <= 50;

  // colorbar gradient stops: left = low loss (bright), right = high loss (dark)
  const barStops = [];
  for (let i = 0; i <= 8; i++) {
    const [r, g, b] = cmap(1 - i / 8);
    barStops.push(<stop offset={`${(i / 8) * 100}%`} stop-color={`rgb(${r},${g},${b})`} />);
  }

  const accentBtn = { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' };

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          {PRESETS.map((p) => (
            <button class={styles.button} style={presetKey === p.key ? accentBtn : {}} onClick={() => setPresetKey(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <div class={styles.controlRow}>
          {ALGOS.map((a) => (
            <button class={styles.button} style={algo === a ? accentBtn : {}} onClick={() => setAlgo(a)}>
              {a}
            </button>
          ))}
          <button class={styles.button} onClick={() => { setPlaying(false); stepRef.current(); }}>Step</button>
          <button class={styles.button} style={playing ? accentBtn : {}} onClick={() => setPlaying((p) => !p)}>
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
        <div class={styles.controls} style={{ padding: 0, border: 'none', background: 'none', margin: 0, width: '100%', flexBasis: '100%' }}>
          <div class={styles.controlGroup}>
            <label class={styles.controlLabel}>
              learning rate η = <span class={styles.controlValue}>{eta.toFixed(3)}</span>
            </label>
            <input class={styles.slider} type="range" min="0.001" max="0.5" step="0.001" value={eta} onInput={(e) => setEta(parseFloat(e.currentTarget.value))} />
          </div>
          {algo === 'Momentum' && (
            <div class={styles.controlGroup}>
              <label class={styles.controlLabel}>
                momentum β = <span class={styles.controlValue}>{beta.toFixed(2)}</span>
              </label>
              <input class={styles.slider} type="range" min="0" max="0.99" step="0.01" value={beta} onInput={(e) => setBeta(parseFloat(e.currentTarget.value))} />
            </div>
          )}
          {algo === 'SGD' && (
            <div class={styles.controlGroup}>
              <label class={styles.controlLabel}>
                noise σ = <span class={styles.controlValue}>{sigma.toFixed(2)}</span>
              </label>
              <input class={styles.slider} type="range" min="0" max="2" step="0.01" value={sigma} onInput={(e) => setSigma(parseFloat(e.currentTarget.value))} />
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: '100%',
            maxWidth: '380px',
            height: 'auto',
            cursor: 'crosshair',
            border: '1px solid var(--sl-color-gray-5)',
            borderRadius: '8px',
            display: 'block',
          }}
          onClick={onSvgClick}
          role="img"
          aria-label="Gradient descent on a 2D loss surface; click to relaunch"
        >
          <defs>
            <clipPath id="gd-clip">
              <rect x="0" y="0" width={W} height={H} rx="8" />
            </clipPath>
          </defs>
          <g clip-path="url(#gd-clip)">
            <image href={surface.url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
            {/* contour lines */}
            {surface.contours.map((d) => (
              <path d={d} fill="none" stroke="#ffffff" stroke-opacity="0.3" stroke-width="0.8" />
            ))}

            {/* minimum marker: dark halo ring + white ring + plus */}
            {preset.minimum && (
              <g>
                <circle cx={px(preset.minimum.x)} cy={py(preset.minimum.y)} r="8" fill="none" stroke="rgba(0,0,0,0.55)" stroke-width="4" />
                <circle cx={px(preset.minimum.x)} cy={py(preset.minimum.y)} r="8" fill="none" stroke="#ffffff" stroke-width="2" />
                <line x1={px(preset.minimum.x) - 4} y1={py(preset.minimum.y)} x2={px(preset.minimum.x) + 4} y2={py(preset.minimum.y)} stroke="#ffffff" stroke-width="1.5" />
                <line x1={px(preset.minimum.x)} y1={py(preset.minimum.y) - 4} x2={px(preset.minimum.x)} y2={py(preset.minimum.y) + 4} stroke="#ffffff" stroke-width="1.5" />
              </g>
            )}

            {/* trajectory: dark halo under white line */}
            <polyline points={poly} fill="none" stroke="rgba(0,0,0,0.5)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
            <polyline points={poly} fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

            {/* trail dots (only when few) */}
            {showDots &&
              iter.slice(0, -1).map((p) => (
                <circle cx={px(p.x)} cy={py(p.y)} r="2.4" fill="#ffffff" stroke="rgba(0,0,0,0.5)" stroke-width="0.8" />
              ))}

            {/* current point */}
            <circle cx={px(last.x)} cy={py(last.y)} r="6.5" fill="#ffffff" stroke="rgba(0,0,0,0.6)" stroke-width="1.5" />
            <circle cx={px(last.x)} cy={py(last.y)} r="3" fill={ACCENT} />
          </g>
        </svg>

        {/* colorbar */}
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78em', color: 'var(--sl-color-text)' }}>
          <span>low loss</span>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" style={{ flex: 1, height: '10px', borderRadius: '3px', display: 'block' }}>
            <defs>
              <linearGradient id="gd-bar" x1="0" y1="0" x2="1" y2="0">{barStops}</linearGradient>
            </defs>
            <rect x="0" y="0" width="100" height="8" fill="url(#gd-bar)" />
          </svg>
          <span>high loss</span>
        </div>
      </div>

      <div class={styles.legend}>
        <span>
          step <strong>{iter.length - 1}</strong>; current loss f = <strong>{fVal.toFixed(3)}</strong>. The white ring marks the
          true minimum where one exists. Click anywhere on the surface to set a new starting point.
        </span>
      </div>
    </div>
  );
}
