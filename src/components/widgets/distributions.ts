// Sampling and known moments for distributions used in the interactive widgets.

export type DistKey = 'bernoulli' | 'uniform' | 'exponential' | 'dice';

export interface Distribution {
  key: DistKey;
  label: string;
  shortLabel: string;
  sample: () => number;
  mean: number;
  variance: number;
}

function bernoulli(p: number): Distribution {
  return {
    key: 'bernoulli',
    label: `Bernoulli(${p})`,
    shortLabel: 'Bernoulli',
    sample: () => (Math.random() < p ? 1 : 0),
    mean: p,
    variance: p * (1 - p),
  };
}

function uniform(): Distribution {
  return {
    key: 'uniform',
    label: 'Uniform(0, 1)',
    shortLabel: 'Uniform',
    sample: () => Math.random(),
    mean: 0.5,
    variance: 1 / 12,
  };
}

function exponential(rate: number): Distribution {
  return {
    key: 'exponential',
    label: `Exponential(${rate})`,
    shortLabel: 'Exponential',
    sample: () => -Math.log(1 - Math.random()) / rate,
    mean: 1 / rate,
    variance: 1 / (rate * rate),
  };
}

function dice(): Distribution {
  // Fair 6-sided die, values 1..6.
  const mean = 3.5;
  // Var = E[X^2] - mean^2 = 91/6 - 49/4 = 35/12
  const variance = 35 / 12;
  return {
    key: 'dice',
    label: 'Fair die (1..6)',
    shortLabel: 'Dice',
    sample: () => 1 + Math.floor(Math.random() * 6),
    mean,
    variance,
  };
}

export const distributions: Record<DistKey, Distribution> = {
  bernoulli: bernoulli(0.5),
  uniform: uniform(),
  exponential: exponential(1),
  dice: dice(),
};

export const distKeys: DistKey[] = ['bernoulli', 'uniform', 'exponential', 'dice'];

// Standard normal density.
export function phi(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
