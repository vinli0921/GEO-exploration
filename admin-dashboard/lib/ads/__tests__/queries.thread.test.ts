import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';
import { seedFixture } from '../__fixtures__/seed';
import { getUserConversations, getConversationThread, resolveUserByPseudonym } from '../queries';
import { pseudonym } from '../../pseudonym';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;
let fixture: Awaited<ReturnType<typeof seedFixture>>;

beforeAll(async () => {
  process.env.PSEUDONYM_SECRET = 'test-secret';
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db();
  fixture = await seedFixture(db);
});

afterAll(async () => { await client.close(); await mongod.stop(); });

describe('resolveUserByPseudonym', () => {
  it('maps pseudonym back to the matching _id when PSEUDONYM_SECRET matches', async () => {
    const uid = fixture.users[1];
    const pn = pseudonym(uid);
    const resolved = await resolveUserByPseudonym(db, pn);
    expect(resolved?.toString()).toBe(uid.toString());
  });

  it('returns null for unknown pseudonym', async () => {
    const resolved = await resolveUserByPseudonym(db, 'user-ffffff');
    expect(resolved).toBeNull();
  });
});

describe('getUserConversations', () => {
  it('returns conversations with ad count for a user', async () => {
    const uid = fixture.users[1];
    const rows = await getUserConversations(db, uid);
    expect(rows).toHaveLength(1);
    expect(rows[0].conversationId).toBe('conv-in1');
    expect(rows[0].adCount).toBe(2);
  });
});

describe('getConversationThread', () => {
  it('returns ordered user+assistant messages with ad overlays on user turns', async () => {
    const uid = fixture.users[1];
    const msgs = await getConversationThread(db, uid, 'conv-in1');
    expect(msgs.length).toBe(4);

    const userMsgs = msgs.filter(m => m.isCreatedByUser);
    const u1 = userMsgs.find(m => m.text === 'best blender')!;
    expect(u1.adOverlay).toBeDefined();
    expect(u1.adOverlay!.variant).toBe('sponsored-inline');
    expect(u1.adOverlay!.events.map(e => e.eventType)).toContain('impression');
    expect(u1.adOverlay!.events.map(e => e.eventType)).toContain('link_visit');
    expect(u1.adOverlay!.totalHoverMs).toBe(1000);

    const u2 = userMsgs.find(m => m.text === 'under 100')!;
    expect(u2.adOverlay).toBeDefined();
    expect(u2.adOverlay!.events.map(e => e.eventType)).not.toContain('link_visit');
  });

  it('flattens assistant content blocks into text', async () => {
    const uid = fixture.users[1];
    const msgs = await getConversationThread(db, uid, 'conv-in1');
    const assistants = msgs.filter(m => !m.isCreatedByUser);
    expect(assistants[0].text).toContain('Here are some blenders');
  });
});
