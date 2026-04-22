import { formatAdEventRow, AD_EVENT_CSV_HEADER } from '../csv';

describe('formatAdEventRow', () => {
  it('formats a row with all fields', () => {
    const row = formatAdEventRow({
      timestamp: new Date('2026-04-10T12:00:00Z'),
      pseudonym: 'user-abc123',
      variant: 'sponsored-inline',
      eventType: 'impression',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      queryText: 'best blender',
    });
    expect(row).toEqual([
      '2026-04-10T12:00:00.000Z',
      'user-abc123',
      'sponsored-inline',
      'impression',
      'conv-1',
      'msg-1',
      'best blender',
    ]);
  });

  it('keeps special characters intact (csv-stringify handles escaping)', () => {
    const row = formatAdEventRow({
      timestamp: new Date('2026-04-10T12:00:00Z'),
      pseudonym: 'user-a1',
      variant: 'sponsored-outside',
      eventType: 'hover_start',
      conversationId: 'c,1',
      messageId: 'm"1',
      queryText: 'a, b "c"',
    });
    expect(row[4]).toBe('c,1');
    expect(row[5]).toBe('m"1');
    expect(row[6]).toBe('a, b "c"');
  });
});

describe('AD_EVENT_CSV_HEADER', () => {
  it('has the expected columns in order', () => {
    expect(AD_EVENT_CSV_HEADER).toEqual([
      'timestamp',
      'pseudonym',
      'variant',
      'eventType',
      'conversationId',
      'messageId',
      'queryText',
    ]);
  });
});
