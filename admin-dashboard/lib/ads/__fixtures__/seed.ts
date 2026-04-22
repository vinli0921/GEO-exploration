import { Db, ObjectId } from 'mongodb';

/** Seed the four collections with a small deterministic dataset for tests. */
export async function seedFixture(db: Db): Promise<{
  users: ObjectId[];
  conversations: string[];
  userMessages: string[];
}> {
  const u = [new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId(), new ObjectId()];

  await db.collection('users').insertMany([
    { _id: u[0], email: 'ctl@test', name: 'Ctl',    experimentAssignment: { studyId: 'study-1', variant: 'control',            assignedAt: new Date('2026-04-07') } },
    { _id: u[1], email: 'in1@test', name: 'In1',    experimentAssignment: { studyId: 'study-1', variant: 'sponsored-inline',   assignedAt: new Date('2026-04-07') } },
    { _id: u[2], email: 'in2@test', name: 'In2',    experimentAssignment: { studyId: 'study-1', variant: 'sponsored-inline',   assignedAt: new Date('2026-04-07') } },
    { _id: u[3], email: 'out@test', name: 'Out',    experimentAssignment: { studyId: 'study-1', variant: 'sponsored-outside',  assignedAt: new Date('2026-04-07') } },
    { _id: u[4], email: 'n/a@test', name: 'NoAssn' },
  ]);

  const conv1 = 'conv-in1';
  const conv2 = 'conv-out';
  await db.collection('conversations').insertMany([
    { _id: new ObjectId(), conversationId: conv1, user: u[1].toString(), title: 'Blender chat', createdAt: new Date('2026-04-08T10:00:00Z'), updatedAt: new Date('2026-04-08T10:05:00Z') },
    { _id: new ObjectId(), conversationId: conv2, user: u[3].toString(), title: 'Laptop chat',  createdAt: new Date('2026-04-08T11:00:00Z'), updatedAt: new Date('2026-04-08T11:05:00Z') },
  ]);

  const m = ['um1', 'am1', 'um2', 'am2'];
  const m2 = ['um3', 'am3'];
  await db.collection('messages').insertMany([
    { _id: new ObjectId(), messageId: m[0],  conversationId: conv1, user: u[1].toString(), isCreatedByUser: true,  sender: 'User',   text: 'best blender',            createdAt: new Date('2026-04-08T10:00:10Z') },
    { _id: new ObjectId(), messageId: m[1],  conversationId: conv1, user: u[1].toString(), isCreatedByUser: false, sender: 'GPT-5',  text: '', content: [{ type: 'text', text: 'Here are some blenders...' }], createdAt: new Date('2026-04-08T10:00:15Z') },
    { _id: new ObjectId(), messageId: m[2],  conversationId: conv1, user: u[1].toString(), isCreatedByUser: true,  sender: 'User',   text: 'under 100',               createdAt: new Date('2026-04-08T10:01:00Z') },
    { _id: new ObjectId(), messageId: m[3],  conversationId: conv1, user: u[1].toString(), isCreatedByUser: false, sender: 'GPT-5',  text: '', content: [{ type: 'text', text: 'Budget picks...' }],           createdAt: new Date('2026-04-08T10:01:05Z') },
    { _id: new ObjectId(), messageId: m2[0], conversationId: conv2, user: u[3].toString(), isCreatedByUser: true,  sender: 'User',   text: 'best laptop under 1000',  createdAt: new Date('2026-04-08T11:00:10Z') },
    { _id: new ObjectId(), messageId: m2[1], conversationId: conv2, user: u[3].toString(), isCreatedByUser: false, sender: 'GPT-5',  text: '', content: [{ type: 'text', text: 'Laptop options...' }],          createdAt: new Date('2026-04-08T11:00:15Z') },
  ]);

  const t0 = new Date('2026-04-08T10:00:12Z').getTime();
  const t1 = new Date('2026-04-08T11:00:12Z').getTime();
  await db.collection('adevents').insertMany([
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'impression',     productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0) },
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'viewport_enter', productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0 + 100) },
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'hover_start',    productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0 + 500) },
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'hover_end',      productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0 + 1500) },
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'viewport_exit',  productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0 + 2000) },
    { userId: u[1], conversationId: conv1, messageId: m[0], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'link_visit',     productSource: 'sponsored', queryText: 'best blender', timestamp: new Date(t0 + 3000) },

    { userId: u[1], conversationId: conv1, messageId: m[2], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'impression',     productSource: 'sponsored', queryText: 'under 100', timestamp: new Date(t0 + 60_000) },
    { userId: u[1], conversationId: conv1, messageId: m[2], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'viewport_enter', productSource: 'sponsored', queryText: 'under 100', timestamp: new Date(t0 + 60_100) },
    { userId: u[1], conversationId: conv1, messageId: m[2], studyId: 'study-1', variant: 'sponsored-inline',  eventType: 'viewport_exit',  productSource: 'sponsored', queryText: 'under 100', timestamp: new Date(t0 + 61_000) },

    { userId: u[3], conversationId: conv2, messageId: m2[0], studyId: 'study-1', variant: 'sponsored-outside', eventType: 'impression',     productSource: 'sponsored', queryText: 'best laptop under 1000', timestamp: new Date(t1) },
    { userId: u[3], conversationId: conv2, messageId: m2[0], studyId: 'study-1', variant: 'sponsored-outside', eventType: 'viewport_enter', productSource: 'sponsored', queryText: 'best laptop under 1000', timestamp: new Date(t1 + 100) },
    { userId: u[3], conversationId: conv2, messageId: m2[0], studyId: 'study-1', variant: 'sponsored-outside', eventType: 'hover_start',    productSource: 'sponsored', queryText: 'best laptop under 1000', timestamp: new Date(t1 + 500) },
    { userId: u[3], conversationId: conv2, messageId: m2[0], studyId: 'study-1', variant: 'sponsored-outside', eventType: 'hover_end',      productSource: 'sponsored', queryText: 'best laptop under 1000', timestamp: new Date(t1 + 1100) },
    { userId: u[3], conversationId: conv2, messageId: m2[0], studyId: 'study-1', variant: 'sponsored-outside', eventType: 'viewport_exit',  productSource: 'sponsored', queryText: 'best laptop under 1000', timestamp: new Date(t1 + 2000) },
  ]);

  return {
    users: u,
    conversations: [conv1, conv2],
    userMessages: [m[0], m[2], m2[0]],
  };
}
