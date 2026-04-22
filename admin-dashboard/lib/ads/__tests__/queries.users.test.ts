import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getUserList } from '../queries';

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

describe('getUserList', () => {
  it('includes all study users (including those with 0 conversations)', async () => {
    const rows = await getUserList(db);
    expect(rows).toHaveLength(4);
    const variants = rows.map(r => r.variant).sort();
    expect(variants).toEqual(['control', 'sponsored-inline', 'sponsored-inline', 'sponsored-outside']);
  });

  it('pseudonymizes all users (no email, no name)', async () => {
    const rows = await getUserList(db);
    for (const r of rows) {
      expect(r.pseudonym).toMatch(/^user-[0-9a-f]{6}$/);
      expect(r).not.toHaveProperty('email');
      expect(r).not.toHaveProperty('name');
    }
  });

  it('counts conversations, impressions, hovers, link_visits per user', async () => {
    const rows = await getUserList(db);
    expect(rows[0].impressions).toBe(2);
    expect(rows[0].hovers).toBe(1);
    expect(rows[0].linkVisits).toBe(1);
    expect(rows[0].conversationCount).toBe(1);
  });
});
