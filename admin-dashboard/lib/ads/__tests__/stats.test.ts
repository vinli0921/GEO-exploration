import { wilsonCI, newcombeDiffCI, percentile } from '../stats';

describe('wilsonCI', () => {
  it('handles 0 successes', () => {
    const { lower, upper, point } = wilsonCI(0, 10);
    expect(point).toBe(0);
    expect(lower).toBe(0);
    expect(upper).toBeGreaterThan(0);
    expect(upper).toBeLessThan(1);
  });

  it('handles 100% successes', () => {
    const { lower, upper, point } = wilsonCI(10, 10);
    expect(point).toBe(1);
    expect(upper).toBe(1);
    expect(lower).toBeLessThan(1);
    expect(lower).toBeGreaterThan(0);
  });

  it('matches published example: 50/100 @ 95% ≈ [0.404, 0.596]', () => {
    const { lower, upper } = wilsonCI(50, 100);
    expect(lower).toBeCloseTo(0.404, 2);
    expect(upper).toBeCloseTo(0.596, 2);
  });

  it('returns {lower:0, upper:0, point:0} when n=0', () => {
    const ci = wilsonCI(0, 0);
    expect(ci).toEqual({ lower: 0, upper: 0, point: 0 });
  });
});

describe('newcombeDiffCI', () => {
  it('returns CI containing point estimate', () => {
    const { lower, upper, point } = newcombeDiffCI(30, 100, 20, 100);
    expect(point).toBeCloseTo(0.1, 10);
    expect(lower).toBeLessThanOrEqual(0.1);
    expect(upper).toBeGreaterThanOrEqual(0.1);
  });

  it('symmetric under swap of groups (sign flips)', () => {
    const a = newcombeDiffCI(30, 100, 20, 100);
    const b = newcombeDiffCI(20, 100, 30, 100);
    expect(a.point).toBeCloseTo(-b.point, 10);
    expect(a.lower).toBeCloseTo(-b.upper, 10);
    expect(a.upper).toBeCloseTo(-b.lower, 10);
  });
});

describe('percentile', () => {
  it('returns NaN for empty array', () => {
    expect(percentile([], 50)).toBeNaN();
  });

  it('returns the single value for 1-element array', () => {
    expect(percentile([42], 50)).toBe(42);
  });

  it('uses linear interpolation', () => {
    expect(percentile([1, 2, 3, 4, 5], 50)).toBeCloseTo(3, 5);
    expect(percentile([1, 2, 3, 4, 5], 25)).toBeCloseTo(2, 5);
    expect(percentile([1, 2, 3, 4, 5], 75)).toBeCloseTo(4, 5);
    expect(percentile([1, 2, 3, 4, 5], 95)).toBeCloseTo(4.8, 5);
  });

  it('sorts input (does not require pre-sorted)', () => {
    expect(percentile([5, 1, 3, 4, 2], 50)).toBeCloseTo(3, 5);
  });
});
