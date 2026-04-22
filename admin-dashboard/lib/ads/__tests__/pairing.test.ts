import { pairDurations } from '../pairing';

type E = { userId: string; messageId: string; eventType: string; timestamp: Date };

const mk = (uid: string, mid: string, et: string, ms: number): E => ({
  userId: uid,
  messageId: mid,
  eventType: et,
  timestamp: new Date(ms),
});

describe('pairDurations', () => {
  it('pairs a single hover_start with the next hover_end in the same group', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 1_000),
      mk('u1', 'm1', 'hover_end',   1_500),
    ];
    const { durations, excluded } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([500]);
    expect(excluded).toBe(0);
  });

  it('pairs multiple start/end within same group in order', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 1_000),
      mk('u1', 'm1', 'hover_end',   1_200),
      mk('u1', 'm1', 'hover_start', 2_000),
      mk('u1', 'm1', 'hover_end',   2_300),
    ];
    const { durations } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([200, 300]);
  });

  it('does not pair across (userId, messageId) groups', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 1_000),
      mk('u2', 'm1', 'hover_end',   1_500),
    ];
    const { durations } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([]);
  });

  it('discards unpaired starts (no matching end)', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 1_000),
    ];
    const { durations, excluded } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([]);
    expect(excluded).toBe(0);
  });

  it('excludes outliers above max duration', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 0),
      mk('u1', 'm1', 'hover_end',   120_000),
    ];
    const { durations, excluded } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([]);
    expect(excluded).toBe(1);
  });

  it('handles unsorted input', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_end',   1_500),
      mk('u1', 'm1', 'hover_start', 1_000),
    ];
    const { durations } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([500]);
  });

  it('matches each start to the NEXT end, not a later one', () => {
    const events: E[] = [
      mk('u1', 'm1', 'hover_start', 1_000),
      mk('u1', 'm1', 'hover_end',   1_500),
      mk('u1', 'm1', 'hover_end',   1_800),
      mk('u1', 'm1', 'hover_start', 2_000),
      mk('u1', 'm1', 'hover_end',   2_500),
    ];
    const { durations } = pairDurations(events, 'hover_start', 'hover_end', 60_000);
    expect(durations).toEqual([500, 500]);
  });
});
