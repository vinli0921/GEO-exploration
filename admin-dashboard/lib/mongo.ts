import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

export async function getMongo(): Promise<Db> {
  if (dbPromise) return dbPromise;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is required');
  }

  dbPromise = (async () => {
    client = new MongoClient(uri, { maxPoolSize: 5 });
    await client.connect();
    return client.db();
  })();

  return dbPromise;
}

// For tests only: allow resetting the singleton.
export function __resetForTests() {
  if (client) client.close().catch(() => {});
  client = null;
  dbPromise = null;
}
