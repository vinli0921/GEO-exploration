export type PairableEvent = {
  userId: string | { toString(): string };
  messageId: string;
  eventType: string;
  timestamp: Date | string | number;
};

export function pairDurations(
  events: PairableEvent[],
  startType: string,
  endType: string,
  maxDurationMs: number,
): { durations: number[]; excluded: number } {
  const groups = new Map<string, PairableEvent[]>();
  for (const e of events) {
    const uid = typeof e.userId === 'string' ? e.userId : e.userId.toString();
    const key = `${uid}::${e.messageId}`;
    let arr = groups.get(key);
    if (!arr) { arr = []; groups.set(key, arr); }
    arr.push(e);
  }

  const durations: number[] = [];
  let excluded = 0;

  for (const arr of groups.values()) {
    arr.sort((a, b) => tsMs(a.timestamp) - tsMs(b.timestamp));
    let openAt: number | null = null;
    for (const ev of arr) {
      if (ev.eventType === startType) {
        openAt = tsMs(ev.timestamp);
      } else if (ev.eventType === endType && openAt !== null) {
        const dur = tsMs(ev.timestamp) - openAt;
        openAt = null;
        if (dur > maxDurationMs) excluded++;
        else if (dur >= 0) durations.push(dur);
      }
    }
  }

  return { durations, excluded };
}

function tsMs(t: Date | string | number): number {
  if (t instanceof Date) return t.getTime();
  if (typeof t === 'number') return t;
  return new Date(t).getTime();
}
