import { ObjectId } from 'mongodb';

describe('pseudonym', () => {
  beforeAll(() => {
    process.env.PSEUDONYM_SECRET = 'test-secret-do-not-use-in-prod';
  });

  it('returns deterministic output for the same input', async () => {
    const { pseudonym } = await import('../pseudonym');
    const id = new ObjectId();
    const a = pseudonym(id);
    const b = pseudonym(id);
    expect(a).toBe(b);
  });

  it('returns different outputs for different inputs', async () => {
    const { pseudonym } = await import('../pseudonym');
    const a = pseudonym(new ObjectId());
    const b = pseudonym(new ObjectId());
    expect(a).not.toBe(b);
  });

  it('uses the user- prefix and 6-char suffix', async () => {
    const { pseudonym } = await import('../pseudonym');
    const out = pseudonym(new ObjectId());
    expect(out).toMatch(/^user-[0-9a-f]{6}$/);
  });

  it('accepts ObjectId or string', async () => {
    const { pseudonym } = await import('../pseudonym');
    const id = new ObjectId();
    expect(pseudonym(id)).toBe(pseudonym(id.toString()));
  });

  it('anonymizeUser strips email/name/username and adds pseudonym', async () => {
    const { anonymizeUser } = await import('../pseudonym');
    const id = new ObjectId();
    const anon = anonymizeUser({
      _id: id,
      email: 'a@b.com',
      name: 'Jane Doe',
      username: 'jdoe',
      role: 'USER',
    });
    expect(anon).not.toHaveProperty('email');
    expect(anon).not.toHaveProperty('name');
    expect(anon).not.toHaveProperty('username');
    expect(anon.pseudonym).toMatch(/^user-[0-9a-f]{6}$/);
    expect(anon.role).toBe('USER');
  });

  it('throws if PSEUDONYM_SECRET is missing', async () => {
    const original = process.env.PSEUDONYM_SECRET;
    delete process.env.PSEUDONYM_SECRET;
    jest.resetModules();
    await expect(import('../pseudonym').then(m => m.pseudonym(new ObjectId())))
      .rejects.toThrow(/PSEUDONYM_SECRET/);
    process.env.PSEUDONYM_SECRET = original;
  });
});
