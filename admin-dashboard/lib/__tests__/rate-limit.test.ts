import { RateLimiter } from '../rate-limit';

describe('RateLimiter', () => {
  it('allows up to max attempts within the window', () => {
    const rl = new RateLimiter({ max: 3, windowMs: 1000 });
    expect(rl.tryConsume('1.2.3.4')).toBe(true);
    expect(rl.tryConsume('1.2.3.4')).toBe(true);
    expect(rl.tryConsume('1.2.3.4')).toBe(true);
    expect(rl.tryConsume('1.2.3.4')).toBe(false);
  });

  it('tracks different keys independently', () => {
    const rl = new RateLimiter({ max: 1, windowMs: 1000 });
    expect(rl.tryConsume('a')).toBe(true);
    expect(rl.tryConsume('a')).toBe(false);
    expect(rl.tryConsume('b')).toBe(true);
  });

  it('resets after the window passes', async () => {
    const rl = new RateLimiter({ max: 1, windowMs: 50 });
    expect(rl.tryConsume('x')).toBe(true);
    expect(rl.tryConsume('x')).toBe(false);
    await new Promise(r => setTimeout(r, 75));
    expect(rl.tryConsume('x')).toBe(true);
  });
});
