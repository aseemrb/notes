import { useEffect, useRef } from 'preact/hooks';
import styles from './widget.module.css';

// Pólya recurrence: three independent simple random walks in 1D, 2D, 3D run
// continuously. Each walk restarts when it returns to the origin (a "return")
// or after maxSteps (give up). The running return rate exposes the dimensional
// dichotomy: ~100% in 1D/2D (recurrent), well below in 3D (transient).
//
// The animation is fully imperative (refs + requestAnimationFrame) so the
// component never re-renders, and Preact never wipes the SVG content we draw.

const SIZE = 240;
const PAD = 18;
const MAX_STEPS = 3000;
const STEPS_PER_FRAME = 4;

const COLOR_1D = '#3b82f6'; // blue
const COLOR_2D = '#22c55e'; // green
const COLOR_3D = '#ef4444'; // red (origin marker)

type Walk = { pos: number[]; steps: number; path: number[][] };

function freshWalk(dim: number): Walk {
  const pos = new Array(dim + 1).fill(0);
  return { pos, steps: 0, path: [pos.slice()] };
}

export default function PolyaRecurrence() {
  const svg1 = useRef<SVGSVGElement>(null);
  const svg2 = useRef<SVGSVGElement>(null);
  const svg3 = useRef<SVGSVGElement>(null);
  const w1 = useRef<HTMLElement>(null);
  const w2 = useRef<HTMLElement>(null);
  const w3 = useRef<HTMLElement>(null);
  const r1 = useRef<HTMLElement>(null);
  const r2 = useRef<HTMLElement>(null);
  const r3 = useRef<HTMLElement>(null);
  const p1 = useRef<HTMLElement>(null);
  const p2 = useRef<HTMLElement>(null);
  const p3 = useRef<HTMLElement>(null);
  const pauseBtn = useRef<HTMLButtonElement>(null);
  const resetHandlerRef = useRef<() => void>(() => {});

  useEffect(() => {
    const svgs = [svg1.current, svg2.current, svg3.current];
    const disp = [
      { w: w1.current, r: r1.current, p: p1.current },
      { w: w2.current, r: r2.current, p: p2.current },
      { w: w3.current, r: r3.current, p: p3.current },
    ];

    const state: Walk[] = [freshWalk(0), freshWalk(1), freshWalk(2)];
    const stats = [
      { w: 0, r: 0 },
      { w: 0, r: 0 },
      { w: 0, r: 0 },
    ];
    let paused = false;
    let raf = 0;

    function step(d: number) {
      const s = state[d];
      const dim = Math.floor(Math.random() * (d + 1));
      s.pos[dim] += Math.random() < 0.5 ? -1 : 1;
      s.steps++;
      s.path.push(s.pos.slice());
    }

    function atOrigin(d: number) {
      return state[d].pos.every((c) => c === 0);
    }

    function maybeReset(d: number) {
      const s = state[d];
      if (s.steps >= 2 && atOrigin(d)) {
        stats[d].w++;
        stats[d].r++;
        state[d] = freshWalk(d);
        return true;
      }
      if (s.steps >= MAX_STEPS) {
        stats[d].w++;
        state[d] = freshWalk(d);
        return true;
      }
      return false;
    }

    function render(d: number) {
      const svg = svgs[d];
      if (!svg) return;
      const path = state[d].path;
      const cx = SIZE / 2;
      const cy = SIZE / 2;
      let s = '';

      if (d === 0) {
        // position over time
        const maxT = Math.max(80, state[0].steps);
        let minP = 0;
        let maxP = 0;
        for (const pt of path) {
          if (pt[0] < minP) minP = pt[0];
          if (pt[0] > maxP) maxP = pt[0];
        }
        const rangeP = Math.max(20, Math.max(-minP, maxP) * 1.2);
        s += `<line x1="${PAD}" y1="${cy}" x2="${SIZE - PAD}" y2="${cy}" stroke="currentColor" stroke-opacity="0.2" stroke-dasharray="3 3"/>`;
        let pts = '';
        for (let i = 0; i < path.length; i++) {
          const px = PAD + (i / maxT) * (SIZE - 2 * PAD);
          const py = cy - (path[i][0] / rangeP) * (SIZE / 2 - PAD);
          pts += `${px.toFixed(1)},${py.toFixed(1)} `;
        }
        s += `<polyline points="${pts}" stroke="${COLOR_1D}" stroke-width="1.3" fill="none"/>`;
        s += `<text x="${PAD}" y="${SIZE - 5}" font-size="10" fill="currentColor" fill-opacity="0.65">time →</text>`;
      } else {
        let mn = 0;
        let mx = 0;
        for (const pt of path) {
          for (let j = 0; j <= d; j++) {
            if (pt[j] < mn) mn = pt[j];
            if (pt[j] > mx) mx = pt[j];
          }
        }
        const range = Math.max(15, Math.max(-mn, mx) * 1.2);
        const sc = (SIZE / 2 - PAD) / range;
        s += `<line x1="${PAD}" y1="${cy}" x2="${SIZE - PAD}" y2="${cy}" stroke="currentColor" stroke-opacity="0.15"/>`;
        s += `<line x1="${cx}" y1="${PAD}" x2="${cx}" y2="${SIZE - PAD}" stroke="currentColor" stroke-opacity="0.15"/>`;

        if (d === 1) {
          let pts = '';
          for (const pt of path) {
            pts += `${(cx + pt[0] * sc).toFixed(1)},${(cy - pt[1] * sc).toFixed(1)} `;
          }
          s += `<polyline points="${pts}" stroke="${COLOR_2D}" stroke-width="1.1" fill="none" stroke-opacity="0.85"/>`;
          s += `<circle cx="${cx}" cy="${cy}" r="3" fill="${COLOR_2D}"/>`;
        } else {
          // 3D projected to xy; depth z colored (orange z>0, blue z<0)
          let maxAbsZ = 1;
          for (const pt of path) maxAbsZ = Math.max(maxAbsZ, Math.abs(pt[2]));
          const stride = Math.max(1, Math.floor(path.length / 600));
          let prev = path[0];
          for (let i = stride; i < path.length; i += stride) {
            const a = prev;
            const b = path[i];
            const z = b[2];
            const hue = z >= 0 ? 25 : 220;
            const light = 55 - 25 * (Math.abs(z) / maxAbsZ);
            s += `<line x1="${(cx + a[0] * sc).toFixed(1)}" y1="${(cy - a[1] * sc).toFixed(1)}" x2="${(cx + b[0] * sc).toFixed(1)}" y2="${(cy - b[1] * sc).toFixed(1)}" stroke="hsl(${hue},65%,${light.toFixed(0)}%)" stroke-width="1.1" stroke-opacity="0.9"/>`;
            prev = b;
          }
          s += `<circle cx="${cx}" cy="${cy}" r="3" fill="${COLOR_3D}"/>`;
          s += `<text x="${PAD}" y="${SIZE - 5}" font-size="10" fill="currentColor" fill-opacity="0.65">depth z: blue −, orange +</text>`;
        }
      }
      svg.innerHTML = s;
    }

    function updateStats(d: number) {
      const st = stats[d];
      if (disp[d].w) disp[d].w!.textContent = String(st.w);
      if (disp[d].r) disp[d].r!.textContent = String(st.r);
      if (disp[d].p) disp[d].p!.textContent = st.w === 0 ? '—' : `${((100 * st.r) / st.w).toFixed(1)}%`;
    }

    function frame() {
      if (paused) return;
      for (let d = 0; d < 3; d++) {
        for (let k = 0; k < STEPS_PER_FRAME; k++) {
          step(d);
          if (maybeReset(d)) break;
        }
        render(d);
        updateStats(d);
      }
      raf = requestAnimationFrame(frame);
    }

    function onPause() {
      paused = !paused;
      if (pauseBtn.current) pauseBtn.current.textContent = paused ? 'resume' : 'pause';
      if (!paused) raf = requestAnimationFrame(frame);
    }
    function onReset() {
      for (let d = 0; d < 3; d++) {
        state[d] = freshWalk(d);
        stats[d] = { w: 0, r: 0 };
        render(d);
        updateStats(d);
      }
    }

    const pb = pauseBtn.current;
    pb?.addEventListener('click', onPause);

    // expose reset handler through a closure attached below
    resetHandlerRef.current = onReset;

    for (let d = 0; d < 3; d++) render(d);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      pb?.removeEventListener('click', onPause);
    };
  }, []);

  const panel = (
    label: string,
    svgRef: typeof svg1,
    wRef: typeof w1,
    rRef: typeof r1,
    pRef: typeof p1,
    aria: string,
  ) => (
    <div style="text-align:center;">
      <div style="font-weight:600;margin-bottom:0.25rem;">{label}</div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style="width:100%;max-width:240px;height:auto;border:1px solid var(--sl-color-gray-5);border-radius:4px;"
        role="img"
        aria-label={aria}
      />
      <div style="font-size:0.82em;margin-top:0.4rem;">
        returns: <strong ref={rRef}>0</strong>/<strong ref={wRef}>0</strong> (
        <strong ref={pRef}>—</strong>)
      </div>
    </div>
  );

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <button ref={pauseBtn} class={styles.button} type="button">
          pause
        </button>
        <button class={styles.button} type="button" onClick={() => resetHandlerRef.current()}>
          reset stats
        </button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.6rem;align-items:start;">
        {panel('1D', svg1, w1, r1, p1, '1D random walk position over time.')}
        {panel('2D', svg2, w2, r2, p2, '2D random walk path.')}
        {panel('3D', svg3, w3, r3, p3, '3D random walk projected to the xy-plane.')}
      </div>
      <div class={styles.legend}>
        <span>
          Each panel restarts on a return to the origin or after {MAX_STEPS} steps.
        </span>
      </div>
    </div>
  );
}
