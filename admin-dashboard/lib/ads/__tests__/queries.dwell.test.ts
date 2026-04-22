import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getDwellStats } from '../queries';

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

describe('getDwellStats', () => {
  it('returns 4 rows (2 variants x 2 metrics)', async () => {
    const rows = await getDwellStats(db, {});
    expect(rows).toHaveLength(4);
  });

  it('computes inline hover: n=1, median=1000ms', async () => {
    const rows = await getDwellStats(db, {});
    const row = rows.find(r => r.variant === 'sponsored-inline' && r.metric === 'hover')!;
    expect(row.n).toBe(1);
    expect(row.median).toBe(1000);
  });

  it('computes outside viewport: n=1, median=1900ms', async () => {
    const rows = await getDwellStats(db, {});
    const row = rows.find(r => r.variant === 'sponsored-outside' && r.metric === 'viewport')!;
    expect(row.n).toBe(1);
    expect(row.median).toBe(1900);
  });
});
