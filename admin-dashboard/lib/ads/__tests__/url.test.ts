import { hostnameFromUrl } from '../url';

describe('hostnameFromUrl', () => {
  it('extracts hostname from a well-formed URL', () => {
    expect(hostnameFromUrl('https://example.com/path?q=1')).toBe('example.com');
  });

  it('lowercases the hostname', () => {
    expect(hostnameFromUrl('https://Example.COM/Foo')).toBe('example.com');
  });

  it('returns null for malformed URLs', () => {
    expect(hostnameFromUrl('not-a-url')).toBeNull();
    expect(hostnameFromUrl('')).toBeNull();
  });

  it('handles URLs with ports', () => {
    expect(hostnameFromUrl('http://localhost:3000/foo')).toBe('localhost');
  });
});
