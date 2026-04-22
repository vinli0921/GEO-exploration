import { signSession, verifySession, constantTimeEqual } from '../auth';

describe('auth', () => {
  const secret = 'test-auth-secret';

  it('signs and verifies a valid session token', async () => {
    const token = await signSession(secret, { issuedAt: Date.now() });
    expect(await verifySession(secret, token)).toBeTruthy();
  });

  it('rejects tampered tokens', async () => {
    const token = await signSession(secret, { issuedAt: Date.now() });
    const tampered = token.slice(0, -2) + 'xx';
    expect(await verifySession(secret, tampered)).toBeNull();
  });

  it('rejects tokens signed with a different secret', async () => {
    const token = await signSession(secret, { issuedAt: Date.now() });
    expect(await verifySession('other-secret', token)).toBeNull();
  });

  it('rejects expired tokens (issuedAt older than maxAge)', async () => {
    const token = await signSession(secret, { issuedAt: Date.now() - 10_000 });
    expect(await verifySession(secret, token, 5_000)).toBeNull();
  });

  it('constant-time-equal returns true for equal strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
  });

  it('constant-time-equal returns false for unequal strings', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'ab')).toBe(false);
  });
});
