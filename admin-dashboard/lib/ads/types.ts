import { ObjectId } from 'mongodb';

export type Variant = 'control' | 'sponsored-inline' | 'sponsored-outside';
export const VARIANTS: readonly Variant[] = ['control', 'sponsored-inline', 'sponsored-outside'];

export type EventType =
  | 'impression'
  | 'viewport_enter'
  | 'viewport_exit'
  | 'hover_start'
  | 'hover_end'
  | 'link_visit';

export const EVENT_TYPES: readonly EventType[] = [
  'impression', 'viewport_enter', 'viewport_exit', 'hover_start', 'hover_end', 'link_visit',
];

/** Raw MongoDB doc shape. */
export type AdEventDoc = {
  _id: ObjectId;
  userId: ObjectId;
  conversationId: string;      // can be the literal "new"
  messageId: string;
  studyId: string;
  variant: string;             // enforce via Variant at query boundary
  eventType: string;           // enforce via EventType at query boundary
  productSource: string;
  queryText: string;
  timestamp: Date;
};

export type UserDoc = {
  _id: ObjectId;
  email?: string;
  name?: string;
  username?: string;
  role?: string;
  createdAt?: Date;
  experimentAssignment?: {
    studyId: string;
    variant: string;
    assignedAt: Date;
  };
};

export type ConversationDoc = {
  _id: ObjectId;
  conversationId: string;
  user: string;         // string form of user._id
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: ObjectId[];
};

export type MessageDoc = {
  _id: ObjectId;
  messageId: string;
  conversationId: string;
  user: string;
  isCreatedByUser: boolean;
  sender?: string;
  text?: string;
  content?: Array<{ type: string; text?: string } | Record<string, unknown>>;
  tokenCount?: number;
  createdAt: Date;
  parentMessageId?: string;
};

/** DTOs returned to the client — never include PII. */
export type EnrollmentRow = { variant: string; count: number };
export type FunnelTotalsRow = { variant: string; eventType: string; count: number };
export type TimeseriesRow = { date: string; variant: string; eventType: string; count: number };

export type LatestEventDto = {
  timestamp: string;
  pseudonym: string;
  variant: string;
  eventType: string;
  queryText: string;
};

export type FunnelStatsRow = {
  variant: string;
  impressions: number;
  viewports: number;
  hovers: number;
  clicks: number;
};

export type DwellSummary = {
  variant: string;
  metric: 'hover' | 'viewport';
  n: number;
  median: number;
  p25: number;
  p75: number;
  p95: number;
  excludedOutliers: number;
};

export type EventBrowserRow = {
  id: string;
  timestamp: string;
  pseudonym: string;
  variant: string;
  eventType: string;
  conversationId: string;
  messageId: string;
  queryText: string;
};

export type UserListRow = {
  pseudonym: string;
  variant: string | null;
  conversationCount: number;
  messageCount: number;
  impressions: number;
  hovers: number;
  linkVisits: number;
};

export type ThreadMessage = {
  messageId: string;
  isCreatedByUser: boolean;
  sender: string;
  text: string;
  createdAt: string;
  adOverlay?: {
    variant: string;
    events: Array<{ eventType: string; timestamp: string }>;
    totalHoverMs: number;
  };
};

export type ThreadConversation = {
  conversationId: string;
  title: string;
  createdAt: string;
  adCount: number;
};
