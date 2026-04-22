type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly buckets = new Map<string, Bucket>();

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max;
    this.windowMs = opts.windowMs;
  }

  tryConsume(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    if (bucket.count >= this.max) return false;
    bucket.count++;
    return true;
  }
}
