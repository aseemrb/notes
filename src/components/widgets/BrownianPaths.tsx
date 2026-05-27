import { useEffect, useRef } from 'preact/hooks';
import styles from './widget.module.css';

// Live Brownian sample paths on [0, 1]. Each "bundle" of paths is drawn left to
// right (revealing precomputed Gaussian-increment paths), then a fresh bundle
// starts, so the dashed ±√t and ±2√t bands fill in over time. Fully imperative
// (refs + requestAnimationFrame) so Preact never re-renders over the drawing.

const W = 600;
const H = 300;
const PAD = { left: 40, right: 14, top: 12, bottom: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const N = 480; // time resolution on [0,1]
const Y_RANGE = 3.2;
const DRAW_SPEED = 3; // time-steps revealed per frame
const COLORS = ['var(--sl-color-accent)', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0891b2'];

function gauss(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const xOf = (t: number) => PAD.left + t * PLOT_W;
const yOf = (val: number) => PAD.top + PLOT_H / 2 - (val / Y_RANGE) * (PLOT_H / 2);

function envelope(c: number, sign: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    pts.push(`${xOf(t).toFixed(1)},${yOf(sign * c * Math.sqrt(t)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const STATIC =
  `<line x1="${PAD.left}" y1="${yOf(0)}" x2="${PAD.left + PLOT_W}" y2="${yOf(0)}" stroke="currentColor" stroke-opacity="0.35"/>` +
  [1, 2]
    .flatMap((c) => [envelope(c, 1), envelope(c, -1)])
    .map((p) => `<polyline points="${p}" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="4 4"/>`)
    .join('') +
  `<text x="${xOf(1) - 3}" y="${yOf(1) - 4}" text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.6">+√t</text>` +
  `<text x="${xOf(1) - 3}" y="${yOf(2) - 4}" text-anchor="end" font-size="11" fill="currentColor" fill-opacity="0.6">+2√t</text>` +
  `<line x1="${PAD.left}" y1="${PAD.top + PLOT_H}" x2="${PAD.left + PLOT_W}" y2="${PAD.top + PLOT_H}" stroke="currentColor"/>` +
  [0, 0.5, 1]
    .map((t) => `<text x="${xOf(t)}" y="${PAD.top + PLOT_H + 17}" text-anchor="middle" font-size="11" fill="currentColor">${t}</text>`)
    .join('') +
  `<text x="${PAD.left + PLOT_W / 2}" y="${H - 1}" text-anchor="middle" font-size="12" fill="currentColor">t</text>`;

export default function BrownianPaths() {
  const svgRef = useRef<SVGSVGElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const addHandler = useRef<() => void>(() => {});
  const removeHandler = useRef<() => void>(() => {});

  useEffect(() => {
    const dt = 1 / N;
    const sd = Math.sqrt(dt);
    let numPaths = 4;
    let paths: Float64Array[] = [];
    let step = 0;
    let holdFrames = 0;
    let paused = false;
    let raf = 0;

    function newBundle() {
      paths = [];
      for (let p = 0; p < numPaths; p++) {
        const arr = new Float64Array(N + 1);
        for (let i = 1; i <= N; i++) arr[i] = arr[i - 1] + sd * gauss();
        paths.push(arr);
      }
      step = 0;
      holdFrames = 0;
    }

    function render() {
      const svg = svgRef.current;
      if (!svg) return;
      let s = STATIC;
      const stride = 2;
      for (let p = 0; p < paths.length; p++) {
        const arr = paths[p];
        let pts = '';
        for (let i = 0; i <= step; i += stride) {
          pts += `${xOf(i / N).toFixed(1)},${yOf(arr[i]).toFixed(1)} `;
        }
        if (step % stride !== 0) pts += `${xOf(step / N).toFixed(1)},${yOf(arr[step]).toFixed(1)} `;
        s += `<polyline points="${pts}" fill="none" stroke="${COLORS[p % COLORS.length]}" stroke-width="1.3" stroke-opacity="0.85" stroke-linejoin="round"/>`;
      }
      svg.innerHTML = s;
      if (countRef.current) countRef.current.textContent = String(numPaths);
    }

    function frame() {
      if (paused) return;
      if (step < N) {
        step = Math.min(N, step + DRAW_SPEED);
        render();
      } else {
        holdFrames++;
        if (holdFrames > 45) newBundle();
      }
      raf = requestAnimationFrame(frame);
    }

    function onPause() {
      paused = !paused;
      if (pauseRef.current) pauseRef.current.textContent = paused ? 'resume' : 'pause';
      if (!paused) raf = requestAnimationFrame(frame);
    }
    addHandler.current = () => {
      numPaths = Math.min(6, numPaths + 1);
      newBundle();
      render();
    };
    removeHandler.current = () => {
      numPaths = Math.max(1, numPaths - 1);
      newBundle();
      render();
    };

    const pb = pauseRef.current;
    pb?.addEventListener('click', onPause);
    newBundle();
    render();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      pb?.removeEventListener('click', onPause);
    };
  }, []);

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <button ref={pauseRef} class={styles.button} type="button">
          pause
        </button>
        <button class={styles.button} type="button" onClick={() => removeHandler.current()}>
          − path
        </button>
        <button class={styles.button} type="button" onClick={() => addHandler.current()}>
          + path
        </button>
        <span class={styles.controlLabel}>
          paths: <span class={styles.controlValue} ref={countRef}>4</span>
        </span>
      </div>
      <svg
        ref={svgRef}
        class={styles.chart}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Live Brownian motion sample paths with plus or minus square-root-t envelopes"
      />
      <div class={styles.legend}>
        <span>
          Continuous Brownian paths from the origin; each bundle redraws so the ±√t and ±2√t bands fill in. Zero drift,
          variance growing linearly in time.
        </span>
      </div>
    </div>
  );
}
