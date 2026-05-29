import { useState } from 'preact/hooks';
import styles from './widget.module.css';

// Backpropagation on a tiny network: scalar input x, one sigmoid hidden unit,
// linear output, squared-error loss to target y.
//   z1 = w1 x + b1,  a1 = sigma(z1),  yhat = z2 = w2 a1 + b2,  L = 1/2 (yhat - y)^2
// The forward pass (black) produces z1, a1, yhat, L. The backward pass (accent)
// produces the adjoints and the weight gradients:
//   d2 = yhat - y,  dL/dw2 = d2 a1,  dL/db2 = d2
//   d1 = w2 d2 sigma'(z1),  dL/dw1 = d1 x,  dL/db1 = d1
// "Step" moves each weight opposite its gradient and the loss falls.

const X = 1.0;
const Y = 0.5;
const LR = 0.25;

const sigmoid = (t: number) => 1 / (1 + Math.exp(-t));
const f3 = (v: number) => v.toFixed(3);
const f2 = (v: number) => v.toFixed(2);

const ACCENT = 'var(--sl-color-text-accent)';

function Slider({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <div class={styles.controlGroup} style={{ minWidth: '8rem', flex: 1 }}>
      <label class={styles.controlLabel}>
        {label} = <span class={styles.controlValue}>{f2(value)}</span>
      </label>
      <input class={styles.slider} type="range" min="-3" max="3" step="0.05" value={value} onInput={(e) => set(parseFloat(e.currentTarget.value))} />
    </div>
  );
}

export default function Backprop() {
  const [w1, setW1] = useState(1.2);
  const [b1, setB1] = useState(-0.4);
  const [w2, setW2] = useState(-1.5);
  const [b2, setB2] = useState(0.6);

  // forward
  const z1 = w1 * X + b1;
  const a1 = sigmoid(z1);
  const yhat = w2 * a1 + b2;
  const L = 0.5 * (yhat - Y) ** 2;

  // backward
  const d2 = yhat - Y; // adjoint at z2
  const gW2 = d2 * a1;
  const gB2 = d2;
  const dA1 = w2 * d2;
  const sp = a1 * (1 - a1); // sigma'(z1)
  const d1 = dA1 * sp; // adjoint at z1
  const gW1 = d1 * X;
  const gB1 = d1;

  const step = () => {
    setW1((v) => v - LR * gW1);
    setB1((v) => v - LR * gB1);
    setW2((v) => v - LR * gW2);
    setB2((v) => v - LR * gB2);
  };
  const reset = () => {
    setW1(1.2);
    setB1(-0.4);
    setW2(-1.5);
    setB2(0.6);
  };

  // geometry
  const VW = 480;
  const VH = 188;
  const cy = 70;
  const nodes = {
    x: 48,
    h: 188,
    o: 320,
    l: 436,
  };
  const box = (cx: number, w: number) => ({ x: cx - w / 2, y: cy - 22, w, h: 44 });

  const Edge = ({ x1, x2, w, g, name }: { x1: number; x2: number; w: number; g: number; name: string }) => (
    <g>
      <line x1={x1} y1={cy} x2={x2} y2={cy} stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#bp-arr)" />
      <text x={(x1 + x2) / 2} y={cy - 10} font-size="11" text-anchor="middle" fill="currentColor">
        {name}={f2(w)}
      </text>
      <text x={(x1 + x2) / 2} y={cy + 18} font-size="10.5" text-anchor="middle" fill={ACCENT}>
        ∂L/∂{name}={f2(g)}
      </text>
    </g>
  );

  return (
    <div class={`${styles.widget} not-content`}>
      <svg class={styles.chart} viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label="Computational graph with forward values and backward gradients">
        <defs>
          <marker id="bp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" fill-opacity="0.55" />
          </marker>
        </defs>

        {/* edges (drawn under nodes) */}
        <Edge x1={nodes.x + 16} x2={nodes.h - 34} w={w1} g={gW1} name="w₁" />
        <Edge x1={nodes.h + 34} x2={nodes.o - 40} w={w2} g={gW2} name="w₂" />
        <line x1={nodes.o + 40} y1={cy} x2={nodes.l - 24} y2={cy} stroke="currentColor" stroke-opacity="0.55" stroke-width="1.5" marker-end="url(#bp-arr)" />

        {/* input node */}
        <circle cx={nodes.x} cy={cy} r="16" fill="none" stroke="currentColor" stroke-opacity="0.6" />
        <text x={nodes.x} y={cy + 4} font-size="12" text-anchor="middle" fill="currentColor">x={f2(X)}</text>

        {/* hidden node */}
        {(() => { const b = box(nodes.h, 68); return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill="var(--sl-color-bg)" stroke="currentColor" stroke-opacity="0.6" />; })()}
        <text x={nodes.h} y={cy - 4} font-size="10.5" text-anchor="middle" fill="currentColor">z₁={f2(z1)}, a₁={f2(a1)}</text>
        <text x={nodes.h} y={cy + 10} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.65">σ(w₁x+b₁)</text>
        <text x={nodes.h} y={cy + 36} font-size="10.5" text-anchor="middle" fill={ACCENT}>δ₁={f2(d1)}</text>
        <text x={nodes.h} y={b1 >= 0 ? cy - 30 : cy - 30} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.75">b₁={f2(b1)}</text>

        {/* output node */}
        {(() => { const b = box(nodes.o, 80); return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill="var(--sl-color-bg)" stroke="currentColor" stroke-opacity="0.6" />; })()}
        <text x={nodes.o} y={cy - 2} font-size="11" text-anchor="middle" fill="currentColor">ŷ={f2(yhat)}</text>
        <text x={nodes.o} y={cy + 12} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.65">w₂a₁+b₂</text>
        <text x={nodes.o} y={cy + 36} font-size="10.5" text-anchor="middle" fill={ACCENT}>δ₂={f2(d2)}</text>
        <text x={nodes.o} y={cy - 30} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.75">b₂={f2(b2)}</text>

        {/* loss node */}
        <circle cx={nodes.l} cy={cy} r="20" fill="none" stroke={ACCENT} stroke-opacity="0.8" />
        <text x={nodes.l} y={cy + 4} font-size="12" text-anchor="middle" fill="currentColor">L={f3(L)}</text>
        <text x={nodes.l} y={cy + 38} font-size="10" text-anchor="middle" fill="currentColor" fill-opacity="0.7">target y={f2(Y)}</text>
      </svg>

      <div class={styles.controls} style={{ alignItems: 'flex-end' }}>
        <Slider label="w₁" value={w1} set={setW1} />
        <Slider label="b₁" value={b1} set={setB1} />
        <Slider label="w₂" value={w2} set={setW2} />
        <Slider label="b₂" value={b2} set={setB2} />
      </div>
      <div class={styles.controlRow}>
        <button class={styles.button} style={{ borderColor: 'var(--sl-color-accent)', color: 'var(--sl-color-text-accent)' }} onClick={step}>
          gradient step
        </button>
        <button class={styles.button} onClick={reset}>
          reset
        </button>
      </div>

      <div class={styles.legend}>
        <span>
          Black: the forward pass values carried left to right. Accent: the adjoints δ and the weight gradients carried right to left. Each weight
          gradient is the adjoint to its right times the activation to its left. <strong>Gradient step</strong> moves every weight by
          −{LR}·∂L/∂w, and the loss <strong>L = {f3(L)}</strong> drops toward zero.
        </span>
      </div>
    </div>
  );
}
