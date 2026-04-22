import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getEnrollment, getFunnelTotals, getLatestEvents, getDailyTimeseries } from '../queries';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  process.env.PSEUDONYM_SECRET = 'test-secret';
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db();
  await seedFixture(db);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

describe('getEnrollment', () => {
  it('returns one row per variant with counts', async () => {
    const rows = await getEnrollment(db);
    const byVariant = Object.fromEntries(rows.map(r => [r.variant, r.count]));
    expect(byVariant['control']).toBe(1);
    expect(byVariant['sponsored-inline']).toBe(2);
    expect(byVariant['sponsored-outside']).toBe(1);
  });
});

describe('getFunnelTotals', () => {
  it('returns per-variant per-eventType counts', async () => {
    const rows = await getFunnelTotals(db);
    const key = (v: string, e: string) => `${v}::${e}`;
    const byKey = Object.fromEntries(rows.map(r => [key(r.variant, r.eventType), r.count]));
    expect(byKey[key('sponsored-inline', 'impression')]).toBe(2);
    expect(byKey[key('sponsored-inline', 'link_visit')]).toBe(1);
    expect(byKey[key('sponsored-outside', 'impression')]).toBe(1);
    expect(byKey[key('sponsored-outside', 'link_visit')]).toBeUndefined();
  });
});

describe('getLatestEvents', () => {
  it('returns pseudonymized rows sorted by newest first', async () => {
    const rows = await getLatestEvents(db, 5);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.pseudonym).toMatch(/^user-[0-9a-f]{6}$/);
      expect(row).not.toHaveProperty('userId');
    }
    for (let i = 1; i < rows.length; i++) {
      expect(new Date(rows[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(new Date(rows[i].timestamp).getTime());
    }
  });
});

describe('getDailyTimeseries', () => {
  it('returns rows with YYYY-MM-DD dates and per-variant counts', async () => {
    const rows = await getDailyTimeseries(db);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['sponsored-inline', 'sponsored-outside']).toContain(r.variant);
    }
  });
});
