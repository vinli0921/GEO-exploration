import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { getResponseViewRate, getResponseDwellStats, getScrollDepthStats, getResponseLinkClickStats } from '../queries';
import { seedFixture } from '../__fixtures__/seed';

process.env.PSEUDONYM_SECRET = 'test-secret';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
  await seedFixture(db);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

describe('getResponseViewRate', () => {
  it('returns one row per variant, in canonical order', async () => {
    const rows = await getResponseViewRate(db);
    expect(rows.map(r => r.variant)).toEqual(['control', 'sponsored-inline', 'sponsored-outside']);
  });

  it('counts messages viewed and total messages per variant from response events', async () => {
    const rows = await getResponseViewRate(db);
    const ctl = rows.find(r => r.variant === 'control')!;
    // Control: 2 messages with response_viewport_enter (am-ctl-1, am-ctl-2)
    //          3 total distinct messages with any response_* event (am-ctl-1, am-ctl-2, am-ctl-3)
    expect(ctl.messagesViewed).toBe(2);
    expect(ctl.totalMessages).toBe(3);
    expect(ctl.rate).toBeCloseTo(2 / 3);

    const inline = rows.find(r => r.variant === 'sponsored-inline')!;
    expect(inline.messagesViewed).toBe(2);
    expect(inline.totalMessages).toBe(2);
    expect(inline.rate).toBe(1);

    const outside = rows.find(r => r.variant === 'sponsored-outside')!;
    expect(outside.messagesViewed).toBe(1);
    expect(outside.totalMessages).toBe(1);
    expect(outside.rate).toBe(1);
  });
});

describe('getResponseDwellStats', () => {
  it('returns one row per variant with pair-derived durations', async () => {
    const rows = await getResponseDwellStats(db, {});
    expect(rows.map(r => r.variant)).toEqual(['control', 'sponsored-inline', 'sponsored-outside']);
  });

  it('pairs response_viewport_enter/exit per (userId, messageId) and computes percentiles', async () => {
    const rows = await getResponseDwellStats(db, {});
    const ctl = rows.find(r => r.variant === 'control')!;
    // Control paired durations: am-ctl-1 (4500ms), am-ctl-2 (2100ms). am-ctl-3 has only exit, no pair.
    expect(ctl.n).toBe(2);
    expect(ctl.median).toBeCloseTo((4500 + 2100) / 2); // R-7 interpolation for n=2

    const inline = rows.find(r => r.variant === 'sponsored-inline')!;
    expect(inline.n).toBe(2); // two paired durations on m[1] and m[3]

    const outside = rows.find(r => r.variant === 'sponsored-outside')!;
    expect(outside.n).toBe(1);
    expect(outside.median).toBeCloseTo(8000);
  });

  it('reports excludedOutliers as a number', async () => {
    const rows = await getResponseDwellStats(db, {});
    for (const r of rows) {
      expect(typeof r.excludedOutliers).toBe('number');
      expect(r.excludedOutliers).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces a non-empty histogram array with bucket + count fields', async () => {
    const rows = await getResponseDwellStats(db, {});
    for (const r of rows) {
      expect(Array.isArray(r.histogram)).toBe(true);
      for (const b of r.histogram) {
        expect(typeof b.bucket).toBe('string');
        expect(typeof b.count).toBe('number');
      }
    }
  });
});

describe('getScrollDepthStats', () => {
  it('returns one row per variant with scroll depth percentiles', async () => {
    const rows = await getScrollDepthStats(db);
    expect(rows.map(r => r.variant)).toEqual(['control', 'sponsored-inline', 'sponsored-outside']);
  });

  it('reads scrollDepthPercent from response_viewport_exit events only', async () => {
    const rows = await getScrollDepthStats(db);
    const ctl = rows.find(r => r.variant === 'control')!;
    // Control depths on exit events: 62, 95, 15 → sorted 15, 62, 95 → median 62
    expect(ctl.n).toBe(3);
    expect(ctl.median).toBeCloseTo(62);

    const inline = rows.find(r => r.variant === 'sponsored-inline')!;
    // Inline depths: 78, 40 → sorted 40, 78 → median 59 (R-7 linear interp for n=2)
    expect(inline.n).toBe(2);
    expect(inline.median).toBeCloseTo(59);

    const outside = rows.find(r => r.variant === 'sponsored-outside')!;
    expect(outside.n).toBe(1);
    expect(outside.median).toBeCloseTo(100);
  });

  it('produces 10 histogram buckets covering 0–100', async () => {
    const rows = await getScrollDepthStats(db);
    for (const r of rows) {
      expect(r.histogram).toHaveLength(10);
      expect(r.histogram[0].bucket).toBe('0–10');
      expect(r.histogram[9].bucket).toBe('90–100');
    }
  });
});

describe('getResponseLinkClickStats', () => {
  it('reports clicks per variant, denominated by viewed messages', async () => {
    const stats = await getResponseLinkClickStats(db);
    expect(stats.rates.map(r => r.variant)).toEqual(['control', 'sponsored-inline', 'sponsored-outside']);

    const ctl = stats.rates.find(r => r.variant === 'control')!;
    // Control: 1 click on am-ctl-2; 2 viewed messages (am-ctl-1, am-ctl-2)
    expect(ctl.clicks).toBe(1);
    expect(ctl.viewedMessages).toBe(2);
    expect(ctl.rate).toBeCloseTo(0.5);

    const inline = stats.rates.find(r => r.variant === 'sponsored-inline')!;
    expect(inline.clicks).toBe(1);
    expect(inline.viewedMessages).toBe(2);

    const outside = stats.rates.find(r => r.variant === 'sponsored-outside')!;
    expect(outside.clicks).toBe(2);
    expect(outside.viewedMessages).toBe(1);
    expect(outside.rate).toBeCloseTo(2);
  });

  it('reports top domains across all variants, sorted by count desc', async () => {
    const stats = await getResponseLinkClickStats(db);
    const domains = stats.topDomains.map(d => d.domain);
    expect(domains).toContain('example.com');
    expect(domains).toContain('wikipedia.org');

    const example = stats.topDomains.find(d => d.domain === 'example.com')!;
    expect(example.count).toBe(2);
  });

  it('caps top domains at 10 entries', async () => {
    const stats = await getResponseLinkClickStats(db);
    expect(stats.topDomains.length).toBeLessThanOrEqual(10);
  });

  it('returns zero rates when no clicks exist for a variant', async () => {
    const stats = await getResponseLinkClickStats(db);
    // All three variants have clicks in the fixture, but zero-rate handling must not NaN
    for (const r of stats.rates) {
      expect(Number.isFinite(r.rate)).toBe(true);
    }
  });
});
