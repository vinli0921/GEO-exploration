import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { streamMessagesForExport } from '../queries';
import type { MessageExportRow } from '../types';

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

async function collect(it: AsyncGenerator<MessageExportRow>): Promise<MessageExportRow[]> {
  const out: MessageExportRow[] = [];
  for await (const r of it) out.push(r);
  return out;
}

describe('streamMessagesForExport', () => {
  it('emits one row per message in study-1 conversations, joined to user variant', async () => {
    const rows = await collect(streamMessagesForExport(db, {}));
    // Seed has conv1 (4 messages, sponsored-inline u[1]) + conv2 (2 messages, sponsored-outside u[3]) = 6 rows
    expect(rows.length).toBe(6);
    const variants = new Set(rows.map(r => r.variant));
    expect(variants).toEqual(new Set(['sponsored-inline', 'sponsored-outside']));
  });

  it('marks user vs assistant role correctly', async () => {
    const rows = await collect(streamMessagesForExport(db, {}));
    const userMsgs = rows.filter(r => r.role === 'user');
    const aiMsgs = rows.filter(r => r.role === 'assistant');
    expect(userMsgs.length).toBe(3);
    expect(aiMsgs.length).toBe(3);
  });

  it('flattens content[] for assistant messages', async () => {
    const rows = await collect(streamMessagesForExport(db, {}));
    const ai = rows.filter(r => r.role === 'assistant');
    for (const r of ai) {
      expect(r.text.length).toBeGreaterThan(0);
    }
  });

  it('filters by variant', async () => {
    const inline = await collect(streamMessagesForExport(db, { variant: 'sponsored-inline' }));
    expect(inline.length).toBe(4);
    expect(inline.every(r => r.variant === 'sponsored-inline')).toBe(true);

    const outside = await collect(streamMessagesForExport(db, { variant: 'sponsored-outside' }));
    expect(outside.length).toBe(2);
    expect(outside.every(r => r.variant === 'sponsored-outside')).toBe(true);

    const control = await collect(streamMessagesForExport(db, { variant: 'control' }));
    expect(control.length).toBe(0); // seed has no conversations under control user
  });

  it('filters by date range', async () => {
    const rows = await collect(streamMessagesForExport(db, {
      from: new Date('2026-04-08T11:00:00Z'),
    }));
    // Only conv2 messages (created 11:00:10–11:00:15) meet the >= 11:00 filter
    expect(rows.length).toBe(2);
    for (const r of rows) {
      expect(r.variant).toBe('sponsored-outside');
    }
  });

  it('pseudonymizes userId and never emits raw _id', async () => {
    const rows = await collect(streamMessagesForExport(db, {}));
    for (const r of rows) {
      expect(r.pseudonym).toMatch(/^user-[0-9a-f]{6}$/);
      expect(r as unknown as { user?: unknown }).not.toHaveProperty('user');
      expect(r as unknown as { userId?: unknown }).not.toHaveProperty('userId');
    }
  });
});
