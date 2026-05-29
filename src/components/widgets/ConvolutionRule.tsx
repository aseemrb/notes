import { useMemo, useState } from 'preact/hooks';
import styles from './widget.module.css';

// The convolution rule made visible. A signal x is convolved (cyclically) with a
// short filter h to give y = x (*) h in the space domain. Below, the discrete
// Fourier transforms show the same operation as a pointwise product of spectra:
// |F y|_k = |F x|_k * |F h|_k. Choosing a low-pass filter shrinks the high
// frequencies of x; an edge filter shrinks the low ones. Filtering IS spectral
// shaping -- that is the content of the rule.

const N = 32;
const TWO_PI = 2 * Math.PI;

type SigPreset = { key: string; label: string; gen: (j: number) => number };
const SIGNALS: SigPreset[] = [
  { key: 'tones', label: 'Two tones', gen: (j) => Math.sin((TWO_PI * 2 * j) / N) + 0.6 * Math.sin((TWO_PI * 7 * j) / N) },
  { key: 'low', label: 'Low tone', gen: (j) => Math.sin((TWO_PI * 2 * j) / N) },
  { key: 'high', label: 'High tone', gen: (j) => Math.sin((TWO_PI * 11 * j) / N) },
  { key: 'impulse', label: 'Impulse', gen: (j) => (j === N / 2 ? 1.4 : 0) },
];

// Filters given as {offset: weight} centred at 0; placed cyclically into length N.
type FiltPreset = { key: string; label: string; taps: [number, number][] };
const FILTERS: FiltPreset[] = [
  { key: 'box', label: 'Box (low-pass)', taps: [[-2, 0.2], [-1, 0.2], [0, 0.2], [1, 0.2], [2, 0.2]] },
  { key: 'gauss', label: 'Smooth', taps: [[-2, 0.1], [-1, 0.25], [0, 0.3], [1, 0.25], [2, 0.1]] },
  { key: 'edge', label: 'Edge (high-pass)', taps: [[-1, -1], [0, 2], [1, -1]] },
  { key: 'delta', label: 'Identity', taps: [[0, 1]] },
];

function filterVector(taps: [number, number][]): number[] {
  const h = new Array(N).fill(0);
  for (const [off, w] of taps) h[((off % N) + N) % N] += w;
  return h;
}

// cyclic convolution y_j = sum_m x_m h_{(j-m) mod n}
function cconv(x: number[], h: number[]): number[] {
  const y = new Array(N).fill(0);
  for (let j = 0; j < N; j++) {
    let s = 0;
    for (let m = 0; m < N; m++) s += x[m] * h[((j - m) % N + N) % N];
    y[j] = s;
  }
  return y;
}

// magnitudes of the DFT, frequencies k = 0..N/2 (real signal => symmetric)
function dftMag(v: number[]): number[] {
  const half = N / 2;
  const out: number[] = [];
  for (let k = 0; k <= half; k++) {
    let re = 0;
    let im = 0;
    for (let m = 0; m < N; m++) {
      const a = (TWO_PI * m * k) / N;
      re += v[m] * Math.cos(a);
      im += v[m] * Math.sin(a);
    }
    out.push(Math.hypot(re, im) / N);
  }
  return out;
}

const PW = 200;
const PH = 110;

// signed bar chart with a centre baseline
function SignedBars({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(1e-6, ...data.map((v) => Math.abs(v)));
  const mid = PH / 2;
  const step = (PW - 8) / data.length;
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: '100%', maxWidth: `${PW}px`, height: 'auto' }} role="img" aria-label={label}>
        <line x1="4" y1={mid} x2={PW - 4} y2={mid} stroke="currentColor" stroke-opacity="0.4" />
        {data.map((v, i) => {
          const h = (Math.abs(v) / max) * (mid - 6);
          return <rect x={4 + i * step} y={v >= 0 ? mid - h : mid} width={Math.max(1.5, step - 1)} height={h} fill={color} fill-opacity="0.85" />;
        })}
      </svg>
      <figcaption style={{ fontSize: '0.78em', color: 'var(--sl-color-text)' }}>{label}</figcaption>
    </figure>
  );
}

// nonnegative bar chart from a baseline at the bottom (for spectra)
function MagBars({ data, color, label }: { data: number[]; color: string; label: string }) {
  const max = Math.max(1e-6, ...data);
  const base = PH - 16;
  const step = (PW - 8) / data.length;
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
      <svg viewBox={`0 0 ${PW} ${PH}`} style={{ width: '100%', maxWidth: `${PW}px`, height: 'auto' }} role="img" aria-label={label}>
        {data.map((v, i) => {
          const h = (v / max) * (base - 6);
          return <rect x={4 + i * step} y={base - h} width={Math.max(1.5, step - 1)} height={h} fill={color} fill-opacity="0.85" />;
        })}
        <line x1="4" y1={base} x2={PW - 4} y2={base} stroke="currentColor" stroke-opacity="0.4" />
        <text x={PW / 2} y={PH - 3} font-size="9" text-anchor="middle" fill="currentColor" fill-opacity="0.7">
          frequency k
        </text>
      </svg>
      <figcaption style={{ fontSize: '0.78em', color: 'var(--sl-color-text)' }}>{label}</figcaption>
    </figure>
  );
}

const ACCENT = 'var(--sl-color-accent)';
const BLUE = '#3b82f6';

const Op = ({ ch }: { ch: string }) => (
  <span style={{ alignSelf: 'center', fontSize: '1.4em', opacity: 0.7, padding: '0 0.1rem' }}>{ch}</span>
);

export default function ConvolutionRule() {
  const [sig, setSig] = useState('tones');
  const [filt, setFilt] = useState('box');

  const { x, h, y, fx, fh, fy } = useMemo(() => {
    const sg = SIGNALS.find((s) => s.key === sig)!;
    const ft = FILTERS.find((f) => f.key === filt)!;
    const x = Array.from({ length: N }, (_, j) => sg.gen(j));
    const h = filterVector(ft.taps);
    const y = cconv(x, h);
    return { x, h, y, fx: dftMag(x), fh: dftMag(h), fy: dftMag(y) };
  }, [sig, filt]);

  return (
    <div class={`${styles.widget} not-content`}>
      <div class={styles.controls}>
        <div class={styles.controlGroup} style={{ minWidth: '10rem' }}>
          <span class={styles.controlLabel}>signal</span>
          <div class={styles.controlRow} style={{ flexWrap: 'wrap' }}>
            {SIGNALS.map((s) => (
              <button
                class={styles.button}
                style={sig === s.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
                onClick={() => setSig(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div class={styles.controlGroup} style={{ minWidth: '10rem' }}>
          <span class={styles.controlLabel}>filter</span>
          <div class={styles.controlRow} style={{ flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <button
                class={styles.button}
                style={filt === f.key ? { borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' } : {}}
                onClick={() => setFilt(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--sl-color-text)' }}>space domain: slide the filter across the signal</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
        <SignedBars data={x} color={BLUE} label="signal x" />
        <Op ch="∗" />
        <SignedBars data={h} color="currentColor" label="filter h" />
        <Op ch="=" />
        <SignedBars data={y} color={ACCENT} label="output x ∗ h" />
      </div>

      <div style={{ fontSize: '0.85em', fontWeight: 600, color: 'var(--sl-color-text)' }}>frequency domain: the transforms multiply pointwise</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
        <MagBars data={fx} color={BLUE} label="|F x|" />
        <Op ch="×" />
        <MagBars data={fh} color="currentColor" label="|F h|" />
        <Op ch="=" />
        <MagBars data={fy} color={ACCENT} label="|F y|" />
      </div>

      <div class={styles.legend}>
        <span>
          The output spectrum is the input spectrum scaled frequency by frequency by the filter&rsquo;s response:{' '}
          <strong>|F y|ₖ = |F x|ₖ · |F h|ₖ</strong>. A low-pass filter keeps the low frequencies and removes the high ones; the edge filter does
          the reverse. Convolving in space is multiplying in frequency.
        </span>
      </div>
    </div>
  );
}
