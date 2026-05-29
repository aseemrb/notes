import { useState } from 'preact/hooks';
import styles from './widget.module.css';

// Circulant spectrum: the user edits the first column c of an n x n circulant C.
// The matrix is rebuilt by cyclic shifts, and its eigenvalues are the discrete
// Fourier transform of c, lambda_k = sum_m c_m w^{mk}, w = e^{2 pi i / n}. The
// eigenVECTORS never change -- they are always the Fourier modes -- so only the
// magnitude bars on the right respond as c is edited. This makes concrete the
// fact that every circulant is diagonalized by the same fixed Fourier matrix.

const N = 8;

type Preset = { key: string; label: string; c: number[] };
const PRESETS: Preset[] = [
  { key: 'shift', label: 'Shift P', c: [0, 1, 0, 0, 0, 0, 0, 0] },
  { key: 'smooth', label: 'Averaging', c: [0.5, 0.25, 0, 0, 0, 0, 0, 0.25] },
  { key: 'diff', label: 'Difference', c: [1, -1, 0, 0, 0, 0, 0, 0] },
  { key: 'wide', label: 'Spread', c: [0.4, 0.3, 0.15, 0.05, 0, 0.05, 0.15, 0.3] },
];

// Discrete Fourier transform magnitudes of the real vector c.
function dftMag(c: number[]): { mag: number; re: number; im: number }[] {
  const n = c.length;
  const out: { mag: number; re: number; im: number }[] = [];
  for (let k = 0; k < n; k++) {
    let re = 0;
    let im = 0;
    for (let m = 0; m < n; m++) {
      const ang = (2 * Math.PI * m * k) / n;
      re += c[m] * Math.cos(ang);
      im += c[m] * Math.sin(ang);
    }
    out.push({ mag: Math.hypot(re, im), re, im });
  }
  return out;
}

// (C)_{jk} = c_{(j - k) mod n}
const circEntry = (c: number[], j: number, k: number) => c[((j - k) % N + N) % N];

const fmt = (v: number) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(Math.abs(v) >= 1 || v === 0 ? 1 : 2).replace(/\.0+$/, ''));

export default function CirculantSpectrum() {
  const [c, setC] = useState<number[]>(PRESETS[1].c.slice());
  const [active, setActive] = useState('smooth');

  const spec = dftMag(c);
  const maxMag = Math.max(1e-6, ...spec.map((s) => s.mag));
  const maxAbs = Math.max(1e-6, ...c.map((v) => Math.abs(v)));

  const applyPreset = (p: Preset) => {
    setC(p.c.slice());
    setActive(p.key);
  };
  const setEntry = (m: number, v: number) => {
    setC((cur) => cur.map((x, i) => (i === m ? v : x)));
    setActive('custom');
  };

  // matrix grid geometry
  const GW = 256;
  const cell = GW / N;
  const GH = GW;
  // shade a matrix cell by signed value (accent for +, currentColor for -)
  const shade = (v: number) => {
    const t = Math.min(1, Math.abs(v) / maxAbs);
    return {
      fill: v >= 0 ? 'var(--sl-color-accent)' : 'currentColor',
      opacity: v === 0 ? 0.06 : 0.12 + 0.55 * t,
    };
  };

  // spectrum bar chart geometry
  const SW = 256;
  const SH = 200;
  const padB = 28;
  const padT = 12;
  const barStep = (SW - 16) / N;

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlRow}>
          {PRESETS.map((p) => (
            <button
              class={styles.button}
              style={active === p.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div class={styles.controlRow} style={{ flexWrap: 'wrap', gap: '0.4rem', alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 600, marginRight: '0.2rem' }}>first column c =</span>
        {c.map((v, m) => (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.72em', gap: '0.1rem' }}>
            <span style={{ opacity: 0.7 }}>c{m}</span>
            <input
              type="number"
              step={0.25}
              value={v}
              onInput={(e) => {
                const x = parseFloat((e.currentTarget as HTMLInputElement).value);
                if (!Number.isNaN(x)) setEntry(m, x);
              }}
              style={{
                width: '3rem',
                textAlign: 'center',
                padding: '0.15rem 0.2rem',
                background: 'var(--sl-color-bg)',
                color: 'inherit',
                border: '1px solid var(--sl-color-gray-5)',
                borderRadius: '4px',
                font: 'inherit',
              }}
            />
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center' }}>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <svg viewBox={`0 0 ${GW} ${GH}`} style={{ width: '100%', maxWidth: '256px', height: 'auto' }} role="img" aria-label="circulant matrix built from the first column">
            {Array.from({ length: N }, (_, j) =>
              Array.from({ length: N }, (_, k) => {
                const v = circEntry(c, j, k);
                const sh = shade(v);
                return (
                  <g>
                    <rect x={k * cell} y={j * cell} width={cell - 1} height={cell - 1} fill={sh.fill} fill-opacity={sh.opacity} />
                    <text
                      x={k * cell + cell / 2}
                      y={j * cell + cell / 2 + 3}
                      font-size="9"
                      text-anchor="middle"
                      fill="currentColor"
                      fill-opacity={v === 0 ? 0.3 : 0.85}
                    >
                      {fmt(v)}
                    </text>
                  </g>
                );
              }),
            )}
          </svg>
          <figcaption style={{ fontSize: '0.8em', color: 'var(--sl-color-text)' }}>circulant C (each column shifts c)</figcaption>
        </figure>

        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <svg viewBox={`0 0 ${SW} ${SH}`} style={{ width: '100%', maxWidth: '256px', height: 'auto' }} role="img" aria-label="eigenvalue magnitudes, the DFT of the first column">
            {spec.map((s, k) => {
              const h = (s.mag / maxMag) * (SH - padB - padT);
              return (
                <g>
                  <rect x={8 + k * barStep} y={SH - padB - h} width={Math.max(2, barStep - 4)} height={h} fill="var(--sl-color-accent)" fill-opacity="0.85" />
                  <text x={8 + k * barStep + (barStep - 4) / 2} y={SH - padB + 13} font-size="9" text-anchor="middle" fill="currentColor" fill-opacity="0.7">
                    {k}
                  </text>
                </g>
              );
            })}
            <line x1="6" y1={SH - padB} x2={SW - 6} y2={SH - padB} stroke="currentColor" stroke-opacity="0.5" />
            <text x={SW / 2} y={SH - 6} font-size="11" text-anchor="middle" fill="currentColor">
              frequency k
            </text>
          </svg>
          <figcaption style={{ fontSize: '0.8em', color: 'var(--sl-color-text)' }}>eigenvalue magnitudes |λₖ| = |(Fc)ₖ|</figcaption>
        </figure>
      </div>

      <div class={styles.legend}>
        <span>
          The eigenvectors are always the fixed Fourier modes; only the eigenvalues change, and they are the discrete Fourier transform of the
          first column, <strong>λₖ = Σₘ cₘ e^(2πi mk/{N})</strong>. A flat spectrum means C is close to a multiple of the shift; a single tall bar
          means C is close to a pure frequency.
        </span>
      </div>
    </div>
  );
}
