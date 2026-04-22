import { MongoMemoryServer } from 'mongodb-memory-server';

describe('getMongo', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
  });

  afterAll(async () => {
    await mongod.stop();
  });

  beforeEach(() => {
    // Reset the singleton between tests by re-importing
    jest.resetModules();
  });

  it('returns a Db instance', async () => {
    const { getMongo } = await import('../mongo');
    const db = await getMongo();
    expect(db).toBeDefined();
    expect(typeof db.collection).toBe('function');
  });

  it('returns the same client on repeated calls (singleton)', async () => {
    const { getMongo } = await import('../mongo');
    const db1 = await getMongo();
    const db2 = await getMongo();
    expect(db1).toBe(db2);
  });

  it('throws at startup if MONGO_URI is missing', async () => {
    const original = process.env.MONGO_URI;
    delete process.env.MONGO_URI;
    await expect(import('../mongo').then(m => m.getMongo())).rejects.toThrow(/MONGO_URI/);
    process.env.MONGO_URI = original;
  });
});
