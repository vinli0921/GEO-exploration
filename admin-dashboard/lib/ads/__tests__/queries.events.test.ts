import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getEventsPage, streamEventsForExport, EventBrowserFilters } from '../queries';

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

describe('getEventsPage', () => {
  it('returns all events paginated by pageSize', async () => {
    const { rows, nextCursor } = await getEventsPage(db, { pageSize: 5 });
    expect(rows.length).toBe(5);
    expect(nextCursor).toBeTruthy();
    expect(rows[0].pseudonym).toMatch(/^user-/);
    expect(rows[0]).not.toHaveProperty('userId');
  });

  it('supports cursor-based pagination', async () => {
    const page1 = await getEventsPage(db, { pageSize: 5 });
    const page2 = await getEventsPage(db, { pageSize: 5, after: page1.nextCursor! });
    const idsPage1 = page1.rows.map(r => r.id);
    const idsPage2 = page2.rows.map(r => r.id);
    expect(idsPage1.filter(i => idsPage2.includes(i))).toEqual([]);
  });

  it('filters by eventType', async () => {
    const { rows } = await getEventsPage(db, { pageSize: 50, eventType: 'impression' });
    for (const r of rows) expect(r.eventType).toBe('impression');
  });

  it('filters by variant', async () => {
    const { rows } = await getEventsPage(db, { pageSize: 50, variant: 'sponsored-inline' });
    for (const r of rows) expect(r.variant).toBe('sponsored-inline');
  });

  it('filters by queryText substring (case-insensitive)', async () => {
    const { rows } = await getEventsPage(db, { pageSize: 50, queryText: 'BLENDER' });
    for (const r of rows) expect(r.queryText.toLowerCase()).toContain('blender');
  });
});

describe('streamEventsForExport', () => {
  it('yields all matching rows without pagination', async () => {
    const collected: any[] = [];
    for await (const row of streamEventsForExport(db, { eventType: 'impression' })) {
      collected.push(row);
    }
    expect(collected.length).toBe(3);
    for (const r of collected) expect(r.pseudonym).toMatch(/^user-/);
  });
});
