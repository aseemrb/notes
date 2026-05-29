import { useMemo, useState } from 'preact/hooks';
import styles from './widget.module.css';

// Spectral clustering on a small graph. We form the Laplacian L = D - W, compute
// its eigenvectors with a symmetric Jacobi solver, and take the Fiedler vector
// (eigenvector of the second-smallest eigenvalue). Its sign splits the nodes into
// two clusters; edges joining the two clusters are the cut, drawn in red. The
// relaxation keeps the cut weight small relative to the group sizes.

type P = { x: number; y: number };
type Preset = { key: string; label: string; nodes: P[]; edges: [number, number][] };

const ringNodes = (n: number): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: 0.5 + 0.36 * Math.cos(a), y: 0.5 + 0.36 * Math.sin(a) };
  });

const PRESETS: Preset[] = [
  {
    key: 'two',
    label: 'Two clusters',
    nodes: [
      { x: 0.2, y: 0.25 }, { x: 0.34, y: 0.46 }, { x: 0.16, y: 0.64 }, { x: 0.32, y: 0.82 },
      { x: 0.68, y: 0.25 }, { x: 0.84, y: 0.46 }, { x: 0.66, y: 0.64 }, { x: 0.82, y: 0.82 },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [4, 5], [5, 6], [6, 7], [4, 6], [5, 7], [3, 4]],
  },
  {
    key: 'two2',
    label: 'Two bridges',
    nodes: [
      { x: 0.2, y: 0.25 }, { x: 0.34, y: 0.46 }, { x: 0.16, y: 0.64 }, { x: 0.32, y: 0.82 },
      { x: 0.68, y: 0.25 }, { x: 0.84, y: 0.46 }, { x: 0.66, y: 0.64 }, { x: 0.82, y: 0.82 },
    ],
    edges: [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [4, 5], [5, 6], [6, 7], [4, 6], [5, 7], [3, 4], [2, 5]],
  },
  {
    key: 'ring',
    label: 'Ring',
    nodes: ringNodes(8),
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0]],
  },
];

// Symmetric eigendecomposition by cyclic Jacobi rotations. Returns eigenvalues
// (ascending) and eigenvectors as columns of V (V[row][col]).
function jacobiEig(Ain: number[][]): { values: number[]; vectors: number[][] } {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => A[a][a] - A[b][b]);
  return {
    values: idx.map((i) => A[i][i]),
    vectors: idx.map((i) => V.map((row) => row[i])), // vectors[k] = k-th eigenvector
  };
}

const VB = 280;
const ACCENT = 'var(--sl-color-accent)';
const BLUE = '#3b82f6';
const CUT = '#e11d48';

export default function SpectralClustering() {
  const [presetKey, setPresetKey] = useState('two');
  const preset = PRESETS.find((p) => p.key === presetKey)!;

  const { fiedler, lambda2, cutEdges, sizes } = useMemo(() => {
    const n = preset.nodes.length;
    const W = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const [i, j] of preset.edges) {
      W[i][j] = 1;
      W[j][i] = 1;
    }
    const L = Array.from({ length: n }, (_, i) => {
      const deg = W[i].reduce((s, v) => s + v, 0);
      return W[i].map((v, j) => (i === j ? deg - v : -v));
    });
    const { values, vectors } = jacobiEig(L);
    const fiedler = vectors[1]; // second-smallest eigenvalue
    const grp = fiedler.map((v) => (v >= 0 ? 1 : -1));
    const cutEdges = preset.edges.filter(([i, j]) => grp[i] !== grp[j]);
    const sizes = [grp.filter((g) => g > 0).length, grp.filter((g) => g < 0).length];
    return { fiedler, lambda2: values[1], cutEdges, sizes };
  }, [presetKey]);

  const px = (x: number) => 24 + x * (VB - 48);
  const py = (y: number) => 24 + y * (VB - 48);
  const cutSet = new Set(cutEdges.map(([i, j]) => `${i}-${j}`));

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
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: '100%', maxWidth: '300px', height: 'auto' }} role="img" aria-label="graph partitioned by the Fiedler vector">
          {/* edges */}
          {preset.edges.map(([i, j]) => {
            const cut = cutSet.has(`${i}-${j}`);
            return (
              <line
                x1={px(preset.nodes[i].x)}
                y1={py(preset.nodes[i].y)}
                x2={px(preset.nodes[j].x)}
                y2={py(preset.nodes[j].y)}
                stroke={cut ? CUT : 'currentColor'}
                stroke-opacity={cut ? 0.95 : 0.3}
                stroke-width={cut ? 2.6 : 1.4}
                stroke-dasharray={cut ? '5 3' : undefined}
              />
            );
          })}
          {/* nodes */}
          {preset.nodes.map((nd, i) => (
            <g>
              <circle cx={px(nd.x)} cy={py(nd.y)} r="12" fill={fiedler[i] >= 0 ? ACCENT : BLUE} stroke="var(--sl-color-bg)" stroke-width="2" />
              <text x={px(nd.x)} y={py(nd.y) + 4} font-size="11" text-anchor="middle" fill="var(--sl-color-bg)" font-weight="600">
                {i}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div class={styles.legend}>
        <span>
          <span class={styles.legendSwatch} style={{ background: 'var(--sl-color-accent)' }} />cluster A&nbsp;&nbsp;
          <span class={styles.legendSwatch} style={{ background: BLUE }} />cluster B&nbsp;&nbsp;
          <span class={styles.legendSwatch} style={{ background: CUT }} />cut edges. Sign of the Fiedler vector splits the nodes{' '}
          <strong>{sizes[0]} : {sizes[1]}</strong>, cutting <strong>{cutEdges.length}</strong> edge{cutEdges.length === 1 ? '' : 's'}. Algebraic
          connectivity λ₂ = <strong>{lambda2.toFixed(3)}</strong>; a small λ₂ means a clean split exists.
        </span>
      </div>
    </div>
  );
}
