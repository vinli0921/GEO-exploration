import { createHmac } from 'crypto';
import type { ObjectId } from 'mongodb';

function getSecret(): string {
  const s = process.env.PSEUDONYM_SECRET;
  if (!s) throw new Error('PSEUDONYM_SECRET environment variable is required');
  return s;
}

export function pseudonym(userId: ObjectId | string): string {
  const id = typeof userId === 'string' ? userId : userId.toString();
  const h = createHmac('sha256', getSecret()).update(id).digest('hex');
  return 'user-' + h.slice(0, 6);
}

type UserLike = {
  _id: ObjectId | string;
  email?: unknown;
  name?: unknown;
  username?: unknown;
  [key: string]: unknown;
};

export function anonymizeUser<T extends UserLike>(u: T): Omit<T, 'email' | 'name' | 'username' | '_id'> & { pseudonym: string } {
  const { email, name, username, _id, ...rest } = u;
  return { ...rest, pseudonym: pseudonym(_id) } as Omit<T, 'email' | 'name' | 'username' | '_id'> & { pseudonym: string };
}
