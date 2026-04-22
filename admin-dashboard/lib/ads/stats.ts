/**
 * Wilson score interval for a binomial proportion. Returns {point, lower, upper}.
 * z=1.96 corresponds to a 95% CI.
 */
export function wilsonCI(successes: number, n: number, z = 1.96): { point: number; lower: number; upper: number } {
  if (n === 0) return { point: 0, lower: 0, upper: 0 };
  const p = successes / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    point: p,
    lower: Math.max(0, center - half),
    upper: Math.min(1, center + half),
  };
}

/**
 * Newcombe's hybrid-score CI for the difference of two proportions p1 - p2.
 * Method 10 from Newcombe (1998), Stat Med 17:873-890.
 */
export function newcombeDiffCI(s1: number, n1: number, s2: number, n2: number, z = 1.96): { point: number; lower: number; upper: number } {
  const w1 = wilsonCI(s1, n1, z);
  const w2 = wilsonCI(s2, n2, z);
  const p1 = n1 > 0 ? s1 / n1 : 0;
  const p2 = n2 > 0 ? s2 / n2 : 0;
  const point = p1 - p2;
  const lower = point - Math.sqrt(Math.pow(p1 - w1.lower, 2) + Math.pow(w2.upper - p2, 2));
  const upper = point + Math.sqrt(Math.pow(w1.upper - p1, 2) + Math.pow(p2 - w2.lower, 2));
  return { point, lower, upper };
}

/**
 * Linear-interpolation percentile (R-7 / numpy default).
 * pct in [0, 100]. Returns NaN for empty input.
 */
export function percentile(values: number[], pct: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const rank = (pct / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
}
