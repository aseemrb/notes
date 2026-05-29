import { useEffect, useRef, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Eckart-Young in action: a small grayscale "image" is treated as a matrix A, and the
// rank-k truncated SVD A_k = sum_{i<k} sigma_i u_i v_i^T is the best rank-k approximation.
// Slide k to watch the reconstruction sharpen; the spectrum tells you how compressible the
// image is. The SVD is computed in-browser once per image with one-sided Jacobi.
//
// The presets are deliberately HARD-edged (sharp circle, diagonal stripes) so their
// singular values decay gradually and the rank-k reconstruction visibly changes as k
// grows -- low k is blurry with ringing, high k is crisp. The "Smooth" preset is the
// contrast case: a separable pattern of rank ~3 that a handful of components capture.

const N = 48; // image is N x N

type SVD = { U: Float64Array[]; s: number[]; V: Float64Array[] };

// One-sided Jacobi SVD of an m x n matrix given as column-major columns.
// Returns left vectors U (unit columns), singular values s, right vectors V, sorted desc.
function jacobiSVD(cols: Float64Array[], m: number, n: number): SVD {
  const U = cols.map((c) => Float64Array.from(c));
  const V: Float64Array[] = [];
  for (let j = 0; j < n; j++) {
    const e = new Float64Array(n);
    e[j] = 1;
    V.push(e);
  }
  const dot = (a: Float64Array, b: Float64Array) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  };
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const Ui = U[i];
        const Uj = U[j];
        const alpha = dot(Ui, Ui);
        const beta = dot(Uj, Uj);
        const gamma = dot(Ui, Uj);
        if (alpha * beta === 0) continue;
        off = Math.max(off, Math.abs(gamma) / Math.sqrt(alpha * beta));
        if (Math.abs(gamma) < 1e-14 * Math.sqrt(alpha * beta)) continue;
        const zeta = (beta - alpha) / (2 * gamma);
        const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
        const c = 1 / Math.sqrt(1 + t * t);
        const s = c * t;
        for (let r = 0; r < m; r++) {
          const a = Ui[r];
          const b = Uj[r];
          Ui[r] = c * a - s * b;
          Uj[r] = s * a + c * b;
        }
        const Vi = V[i];
        const Vj = V[j];
        for (let r = 0; r < n; r++) {
          const a = Vi[r];
          const b = Vj[r];
          Vi[r] = c * a - s * b;
          Vj[r] = s * a + c * b;
        }
      }
    }
    if (off < 1e-12) break;
  }
  const sig = U.map((c) => Math.sqrt(dot(c, c)));
  const order = sig.map((_, i) => i).sort((a, b) => sig[b] - sig[a]);
  const s = order.map((i) => sig[i]);
  const Us = order.map((i) => {
    const col = U[i];
    const norm = sig[i] || 1;
    return col.map((v) => v / norm) as unknown as Float64Array;
  });
  const Vs = order.map((i) => V[i]);
  return { U: Us, s, V: Vs };
}

function makeImage(kind: string): Float64Array[] {
  // column-major: cols[c][r] = pixel (row r, col c), value in [0,1]
  const cols: Float64Array[] = [];
  for (let c = 0; c < N; c++) cols.push(new Float64Array(N));
  const set = (r: number, c: number, v: number) => {
    cols[c][r] = Math.max(0, Math.min(1, v));
  };
  const mid = (N - 1) / 2;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (kind === 'circle') {
        // sharp filled disk: hard radial edge => slowly decaying singular values
        const d = Math.hypot(r - mid, c - mid);
        set(r, c, d <= N * 0.33 ? 0.92 : 0.1);
      } else if (kind === 'stripes') {
        // sharp DIAGONAL square wave: high rank, ringing at low k.
        // (axis-aligned stripes would be rank 1; the diagonal makes it a high-rank Hankel pattern)
        const band = Math.floor((r + c) / (N / 7));
        set(r, c, band % 2 === 0 ? 0.9 : 0.12);
      } else {
        // smooth, separable pattern of rank ~3: a broad Gaussian blob plus a linear ramp.
        // A handful of components capture it -- the compressible contrast case.
        const g = Math.exp(-(((r - N * 0.38) ** 2 + (c - N * 0.62) ** 2)) / (2 * (N * 0.2) ** 2));
        const ramp = (r + 0.5 * c) / (1.5 * N);
        set(r, c, 0.12 + 0.6 * g + 0.28 * ramp);
      }
    }
  }
  return cols;
}

function drawMatrix(canvas: HTMLCanvasElement | null, valueAt: (r: number, c: number) => number) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(N, N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = Math.max(0, Math.min(1, valueAt(r, c)));
      const g = Math.round(255 * v);
      const idx = 4 * (r * N + c);
      img.data[idx] = g;
      img.data[idx + 1] = g;
      img.data[idx + 2] = g;
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const PRESETS: { key: string; label: string }[] = [
  { key: 'circle', label: 'Circle' },
  { key: 'stripes', label: 'Stripes' },
  { key: 'smooth', label: 'Smooth' },
];

const SPEC_W = 200;
const SPEC_H = 170;

export default function LowRankApproximation() {
  const [preset, setPreset] = useState('circle');
  const [k, setK] = useState(6);
  const [svd, setSvd] = useState<SVD | null>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
  const reconRef = useRef<HTMLCanvasElement>(null);

  // Compute the image + SVD on the client whenever the preset changes.
  useEffect(() => {
    const cols = makeImage(preset);
    const decomp = jacobiSVD(cols, N, N);
    setSvd(decomp);
    drawMatrix(origRef.current, (r, c) => cols[c][r]);
  }, [preset]);

  // Rank-k reconstruction.
  useEffect(() => {
    if (!svd) return;
    const recon = new Float64Array(N * N);
    const kk = Math.min(k, svd.s.length);
    for (let t = 0; t < kk; t++) {
      const u = svd.U[t];
      const v = svd.V[t];
      const st = svd.s[t];
      for (let r = 0; r < N; r++) {
        const su = st * u[r];
        for (let c = 0; c < N; c++) recon[r * N + c] += su * v[c];
      }
    }
    drawMatrix(reconRef.current, (r, c) => recon[r * N + c]);
  }, [k, svd]);

  const s = svd?.s ?? [];
  const total = Math.sqrt(s.reduce((acc, v) => acc + v * v, 0)) || 1;
  const err = Math.sqrt(s.slice(k).reduce((acc, v) => acc + v * v, 0));
  const relErr = err / total;
  const storage = (k * (2 * N + 1)) / (N * N);
  const effRank = s.filter((v) => v > 1e-9 * (s[0] || 1)).length;

  const smax = s[0] || 1;
  const barStep = (SPEC_W - 20) / N;

  const canvasStyle = {
    width: '100%',
    maxWidth: '170px',
    aspectRatio: '1 / 1',
    height: 'auto',
    imageRendering: 'pixelated' as const,
    border: '1px solid var(--sl-color-gray-5)',
    borderRadius: '4px',
  };
  const cellStyle = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.3rem' };
  const capStyle = { fontSize: '0.8em', color: 'var(--sl-color-text)' };

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          {PRESETS.map((p) => (
            <button
              class={styles.button}
              style={preset === p.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
              onClick={() => {
                setPreset(p.key);
                setK(6);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div class={styles.controlGroup} style={{ flex: 1, minWidth: '12rem' }}>
          <label class={styles.controlLabel} for="lra-k">
            rank k = <span class={styles.controlValue}>{k}</span> / {N}
          </label>
          <input
            id="lra-k"
            class={styles.slider}
            type="range"
            min="1"
            max={N}
            step="1"
            value={k}
            onInput={(e) => setK(parseInt(e.currentTarget.value, 10))}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          alignItems: 'end',
          width: '100%',
        }}
      >
        <figure style={{ margin: 0, ...cellStyle }}>
          <canvas ref={origRef} width={N} height={N} style={canvasStyle} />
          <figcaption style={capStyle}>original (rank {effRank})</figcaption>
        </figure>
        <figure style={{ margin: 0, ...cellStyle }}>
          <canvas ref={reconRef} width={N} height={N} style={canvasStyle} />
          <figcaption style={capStyle}>rank {k} approximation</figcaption>
        </figure>
        <figure style={{ margin: 0, ...cellStyle }}>
          <svg
            viewBox={`0 0 ${SPEC_W} ${SPEC_H}`}
            style={{ width: '100%', maxWidth: '220px', height: 'auto' }}
            role="img"
            aria-label="singular value spectrum"
          >
            {s.map((v, i) => {
              const h = (v / smax) * (SPEC_H - 40);
              return (
                <rect
                  x={10 + i * barStep}
                  y={SPEC_H - 22 - h}
                  width={Math.max(1, barStep - 0.5)}
                  height={h}
                  fill={i < k ? 'var(--sl-color-accent)' : 'currentColor'}
                  fill-opacity={i < k ? 0.95 : 0.25}
                />
              );
            })}
            <line x1="10" y1={SPEC_H - 22} x2={SPEC_W - 10} y2={SPEC_H - 22} stroke="currentColor" stroke-opacity="0.5" />
            <text x={SPEC_W / 2} y={SPEC_H - 6} font-size="12" text-anchor="middle" fill="currentColor">
              singular values σᵢ
            </text>
          </svg>
          <figcaption style={capStyle}>spectrum (kept in accent)</figcaption>
        </figure>
      </div>

      <div class={styles.legend}>
        <span>
          Keeping the top <strong>{k}</strong> of {N} components: relative error{' '}
          <strong>
            ‖A − A_k‖<sub>F</sub> / ‖A‖<sub>F</sub> = {(relErr * 100).toFixed(1)}%
          </strong>
          , storage <strong>{(storage * 100).toFixed(0)}%</strong> of the full matrix. Eckart–Young guarantees no rank-{k}{' '}
          matrix does better.
        </span>
      </div>
    </div>
  );
}
