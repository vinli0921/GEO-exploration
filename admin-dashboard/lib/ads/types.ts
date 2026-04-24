import { ObjectId } from 'mongodb';

export type Variant = 'control' | 'sponsored-inline' | 'sponsored-outside';
export const VARIANTS: readonly Variant[] = ['control', 'sponsored-inline', 'sponsored-outside'];

export type EventType =
  | 'impression'
  | 'viewport_enter'
  | 'viewport_exit'
  | 'hover_start'
  | 'hover_end'
  | 'link_visit'
  | 'response_viewport_enter'
  | 'response_viewport_exit'
  | 'response_link_click';

export const EVENT_TYPES: readonly EventType[] = [
  'impression', 'viewport_enter', 'viewport_exit',
  'hover_start', 'hover_end', 'link_visit',
  'response_viewport_enter', 'response_viewport_exit', 'response_link_click',
];

/** Raw MongoDB doc shape. */
export type AdEventDoc = {
  _id: ObjectId;
  userId: ObjectId;
  conversationId: string;
  messageId: string;
  studyId: string;
  variant: string;
  eventType: string;
  productSource: string;
  queryText?: string;
  dwellTimeMs?: number;
  hoverTimeMs?: number;
  scrollDepthPercent?: number;
  linkUrl?: string;
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

export type ResponseViewRateRow = {
  variant: string;
  messagesViewed: number;
  totalMessages: number;
  rate: number;
};

export type ResponseDwellSummary = {
  variant: string;
  n: number;
  median: number;
  p25: number;
  p75: number;
  p95: number;
  excludedOutliers: number;
  histogram: Array<{ bucket: string; count: number }>;
};

export type ScrollDepthSummary = {
  variant: string;
  n: number;
  median: number;
  p25: number;
  p75: number;
  histogram: Array<{ bucket: string; count: number }>;
};

export type LinkClickStats = {
  rates: Array<{
    variant: string;
    clicks: number;
    viewedMessages: number;
    rate: number;
  }>;
  topDomains: Array<{ domain: string; count: number }>;
};
