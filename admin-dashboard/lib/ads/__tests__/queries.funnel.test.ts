import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getFunnelStats } from '../queries';

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

afterAll(async () => { await client.close(); await mongod.stop(); });

describe('getFunnelStats', () => {
  it('collapses multiple events per (userId, messageId) into one row per stage', async () => {
    const rows = await getFunnelStats(db, {});
    const inline  = rows.find(r => r.variant === 'sponsored-inline')!;
    const outside = rows.find(r => r.variant === 'sponsored-outside')!;

    expect(inline.impressions).toBe(2);
    expect(inline.viewports).toBe(2);
    expect(inline.hovers).toBe(1);
    expect(inline.clicks).toBe(1);

    expect(outside.impressions).toBe(1);
    expect(outside.viewports).toBe(1);
    expect(outside.hovers).toBe(1);
    expect(outside.clicks).toBe(0);
  });

  it('respects date range filter', async () => {
    const rows = await getFunnelStats(db, {
      from: new Date('2027-01-01'),
      to: new Date('2027-01-02'),
    });
    for (const r of rows) {
      expect(r.impressions).toBe(0);
    }
  });
});
