export const AD_EVENT_CSV_HEADER = [
  'timestamp',
  'pseudonym',
  'variant',
  'eventType',
  'conversationId',
  'messageId',
  'queryText',
] as const;

export type AdEventCsvRow = {
  timestamp: Date;
  pseudonym: string;
  variant: string;
  eventType: string;
  conversationId: string;
  messageId: string;
  queryText: string;
};

export function formatAdEventRow(row: AdEventCsvRow): string[] {
  return [
    row.timestamp.toISOString(),
    row.pseudonym,
    row.variant,
    row.eventType,
    row.conversationId,
    row.messageId,
    row.queryText,
  ];
}
