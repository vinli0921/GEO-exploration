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

export const MESSAGE_CSV_HEADER = [
  'pseudonym',
  'variant',
  'conversation_id',
  'conversation_title',
  'message_id',
  'parent_message_id',
  'role',
  'sender',
  'token_count',
  'created_at',
  'text',
] as const;

export type MessageCsvRow = {
  pseudonym: string;
  variant: string;
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  parentMessageId: string;
  role: string;
  sender: string;
  tokenCount: number | null;
  createdAt: Date;
  text: string;
};

export function formatMessageRow(row: MessageCsvRow): string[] {
  return [
    row.pseudonym,
    row.variant,
    row.conversationId,
    row.conversationTitle,
    row.messageId,
    row.parentMessageId,
    row.role,
    row.sender,
    row.tokenCount == null ? '' : String(row.tokenCount),
    row.createdAt.toISOString(),
    row.text,
  ];
}
