import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { pseudonym } from '../pseudonym';
import {
  VARIANTS,
  type EnrollmentRow, type FunnelTotalsRow, type TimeseriesRow, type LatestEventDto, type FunnelStatsRow, type DwellSummary, type EventBrowserRow, type UserListRow, type ThreadMessage, type ThreadConversation, type ResponseViewRateRow, type ResponseDwellSummary, type ScrollDepthSummary, type LinkClickStats,
} from './types';
import { hostnameFromUrl } from './url';
import { pairDurations } from './pairing';
import { percentile } from './stats';

const STUDY_ID = 'study-1';

const RESPONSE_EVENT_TYPES = [
  'response_viewport_enter',
  'response_viewport_exit',
  'response_link_click',
] as const;

export async function getEnrollment(db: Db): Promise<EnrollmentRow[]> {
  const rows = await db.collection('users').aggregate<{ _id: string | null; count: number }>([
    { $match: { 'experimentAssignment.studyId': STUDY_ID } },
    { $group: { _id: '$experimentAssignment.variant', count: { $sum: 1 } } },
  ]).toArray();
  return rows
    .filter(r => r._id != null)
    .map(r => ({ variant: r._id as string, count: r.count }));
}

export async function getFunnelTotals(db: Db): Promise<FunnelTotalsRow[]> {
  const rows = await db.collection('adevents').aggregate<{ _id: { v: string; e: string }; count: number }>([
    { $match: { studyId: STUDY_ID, variant: { $ne: null } } },
    { $group: { _id: { v: '$variant', e: '$eventType' }, count: { $sum: 1 } } },
  ]).toArray();
  return rows.map(r => ({ variant: r._id.v, eventType: r._id.e, count: r.count }));
}

export async function getDailyTimeseries(db: Db): Promise<TimeseriesRow[]> {
  const rows = await db.collection('adevents').aggregate<{
    _id: { date: Date; v: string; e: string }; count: number;
  }>([
    { $match: { studyId: STUDY_ID, variant: { $ne: null } } },
    {
      $group: {
        _id: {
          date: { $dateTrunc: { date: '$timestamp', unit: 'day' } },
          v: '$variant',
          e: '$eventType',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]).toArray();

  return rows.map(r => ({
    date: r._id.date.toISOString().slice(0, 10),
    variant: r._id.v,
    eventType: r._id.e,
    count: r.count,
  }));
}

export async function getLatestEvents(db: Db, n = 10): Promise<LatestEventDto[]> {
  const rows = await db.collection('adevents')
    .find({ studyId: STUDY_ID, variant: { $ne: null } })
    .sort({ _id: -1 })
    .limit(n)
    .toArray();
  return rows.map(r => ({
    timestamp: (r.timestamp as Date).toISOString(),
    pseudonym: pseudonym(r.userId),
    variant: r.variant as string,
    eventType: r.eventType as string,
    queryText: r.queryText ?? '',
  }));
}

export type FunnelFilters = {
  from?: Date;
  to?: Date;
  minImpressionsPerUser?: number;
};

export async function getFunnelStats(db: Db, filters: FunnelFilters): Promise<FunnelStatsRow[]> {
  const match: Record<string, unknown> = { studyId: STUDY_ID, variant: { $ne: null } };
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    match.timestamp = range;
  }

  const rows = await db.collection('adevents').aggregate<{
    _id: string;
    impressions: number; viewports: number; hovers: number; clicks: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: { userId: '$userId', messageId: '$messageId', variant: '$variant' },
        types: { $addToSet: '$eventType' },
      },
    },
    {
      $project: {
        variant: '$_id.variant',
        sawImpression:   { $in: ['impression',     '$types'] },
        enteredViewport: { $in: ['viewport_enter', '$types'] },
        hovered:         { $in: ['hover_start',    '$types'] },
        clicked:         { $in: ['link_visit',     '$types'] },
      },
    },
    {
      $group: {
        _id: '$variant',
        impressions: { $sum: { $cond: ['$sawImpression',   1, 0] } },
        viewports:   { $sum: { $cond: ['$enteredViewport', 1, 0] } },
        hovers:      { $sum: { $cond: ['$hovered',         1, 0] } },
        clicks:      { $sum: { $cond: ['$clicked',         1, 0] } },
      },
    },
  ]).toArray();

  const existing = new Map(rows.map(r => [r._id, r]));
  const result: FunnelStatsRow[] = [];
  for (const v of ['sponsored-inline', 'sponsored-outside']) {
    const row = existing.get(v);
    result.push({
      variant: v,
      impressions: row?.impressions ?? 0,
      viewports:   row?.viewports ?? 0,
      hovers:      row?.hovers ?? 0,
      clicks:      row?.clicks ?? 0,
    });
  }
  return result;
}

export type DwellFilters = { from?: Date; to?: Date };
const DWELL_MAX_MS = 60_000;

export async function getDwellStats(db: Db, filters: DwellFilters): Promise<DwellSummary[]> {
  const match: Record<string, unknown> = {
    studyId: STUDY_ID,
    variant: { $in: ['sponsored-inline', 'sponsored-outside'] },
    eventType: { $in: ['hover_start', 'hover_end', 'viewport_enter', 'viewport_exit'] },
  };
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    match.timestamp = range;
  }

  const events = await db.collection('adevents')
    .find(match)
    .project({ userId: 1, messageId: 1, eventType: 1, timestamp: 1, variant: 1 })
    .sort({ userId: 1, messageId: 1, timestamp: 1 })
    .toArray();

  const result: DwellSummary[] = [];
  for (const variant of ['sponsored-inline', 'sponsored-outside']) {
    for (const [metric, s, e] of [
      ['hover',    'hover_start',    'hover_end'] as const,
      ['viewport', 'viewport_enter', 'viewport_exit'] as const,
    ]) {
      const filtered = events
        .filter(ev => ev.variant === variant)
        .map(ev => ({
          userId:    ev.userId.toString(),
          messageId: ev.messageId as string,
          eventType: ev.eventType as string,
          timestamp: ev.timestamp as Date,
        }));
      const { durations, excluded } = pairDurations(filtered, s, e, DWELL_MAX_MS);
      result.push({
        variant,
        metric,
        n: durations.length,
        median: durations.length ? percentile(durations, 50) : 0,
        p25:    durations.length ? percentile(durations, 25) : 0,
        p75:    durations.length ? percentile(durations, 75) : 0,
        p95:    durations.length ? percentile(durations, 95) : 0,
        excludedOutliers: excluded,
      });
    }
  }
  return result;
}

export type EventBrowserFilters = {
  pageSize?: number;
  after?: string;
  variant?: string;
  eventType?: string;
  from?: Date;
  to?: Date;
  queryText?: string;
};

function buildEventFilter(filters: EventBrowserFilters): Record<string, unknown> {
  const m: Record<string, unknown> = { studyId: STUDY_ID };
  if (filters.variant)   m.variant = filters.variant;
  if (filters.eventType) m.eventType = filters.eventType;
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    m.timestamp = range;
  }
  if (filters.queryText) {
    const escaped = filters.queryText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    m.queryText = { $regex: escaped, $options: 'i' };
  }
  if (filters.after) {
    m._id = { $lt: new ObjectId(filters.after) };
  }
  return m;
}

function toEventRow(r: any): EventBrowserRow {
  return {
    id: r._id.toString(),
    timestamp: (r.timestamp as Date).toISOString(),
    pseudonym: pseudonym(r.userId),
    variant: r.variant,
    eventType: r.eventType,
    conversationId: r.conversationId,
    messageId: r.messageId,
    queryText: r.queryText ?? '',
  };
}

export async function getEventsPage(
  db: Db,
  filters: EventBrowserFilters,
): Promise<{ rows: EventBrowserRow[]; nextCursor: string | null }> {
  const pageSize = Math.min(Math.max(filters.pageSize ?? 50, 1), 200);
  const docs = await db.collection('adevents')
    .find(buildEventFilter(filters))
    .sort({ _id: -1 })
    .limit(pageSize + 1)
    .toArray();

  const hasMore = docs.length > pageSize;
  const page = docs.slice(0, pageSize);
  return {
    rows: page.map(toEventRow),
    nextCursor: hasMore ? page[page.length - 1]._id.toString() : null,
  };
}

export async function* streamEventsForExport(
  db: Db,
  filters: Omit<EventBrowserFilters, 'pageSize' | 'after'>,
): AsyncGenerator<EventBrowserRow> {
  const cursor = db.collection('adevents')
    .find(buildEventFilter(filters))
    .sort({ _id: -1 });
  for await (const doc of cursor) {
    yield toEventRow(doc);
  }
}

export async function getUserList(db: Db): Promise<UserListRow[]> {
  const rows = await db.collection('users').aggregate<{
    _id: ObjectId;
    variant: string;
    conversationCount: number;
    messageCount: number;
    impressions: number;
    hovers: number;
    linkVisits: number;
  }>([
    { $match: { 'experimentAssignment.studyId': STUDY_ID } },
    {
      $lookup: {
        from: 'conversations',
        let: { uid: { $toString: '$_id' } },
        pipeline: [{ $match: { $expr: { $eq: ['$user', '$$uid'] } } }, { $project: { _id: 1 } }],
        as: 'convs',
      },
    },
    {
      $lookup: {
        from: 'messages',
        let: { uid: { $toString: '$_id' } },
        pipeline: [
          { $match: { $expr: { $eq: ['$user', '$$uid'] } } },
          { $project: { _id: 1 } },
        ],
        as: 'msgs',
      },
    },
    {
      $lookup: {
        from: 'adevents',
        localField: '_id',
        foreignField: 'userId',
        as: 'ads',
      },
    },
    {
      $project: {
        variant: '$experimentAssignment.variant',
        conversationCount: { $size: '$convs' },
        messageCount: { $size: '$msgs' },
        impressions: { $size: { $filter: { input: '$ads', as: 'a', cond: { $eq: ['$$a.eventType', 'impression'] } } } },
        hovers:      { $size: { $filter: { input: '$ads', as: 'a', cond: { $eq: ['$$a.eventType', 'hover_start'] } } } },
        linkVisits:  { $size: { $filter: { input: '$ads', as: 'a', cond: { $eq: ['$$a.eventType', 'link_visit']  } } } },
      },
    },
    { $sort: { impressions: -1 } },
  ]).toArray();

  return rows.map(r => ({
    pseudonym: pseudonym(r._id),
    variant: r.variant,
    conversationCount: r.conversationCount,
    messageCount: r.messageCount,
    impressions: r.impressions,
    hovers: r.hovers,
    linkVisits: r.linkVisits,
  }));
}

export async function resolveUserByPseudonym(db: Db, pn: string): Promise<ObjectId | null> {
  const users = await db.collection('users')
    .find({ 'experimentAssignment.studyId': STUDY_ID })
    .project({ _id: 1 })
    .toArray();
  for (const u of users) {
    if (pseudonym(u._id) === pn) return u._id;
  }
  return null;
}

export async function getUserConversations(db: Db, userId: ObjectId): Promise<ThreadConversation[]> {
  const userIdStr = userId.toString();
  const convos = await db.collection('conversations')
    .find({ user: userIdStr })
    .sort({ createdAt: -1 })
    .toArray();

  const convIds = convos.map(c => c.conversationId as string);

  const userMsgs = await db.collection('messages')
    .find({ conversationId: { $in: convIds }, isCreatedByUser: true })
    .project({ messageId: 1, conversationId: 1 })
    .toArray();

  const msgIdsByConv = new Map<string, Set<string>>();
  for (const m of userMsgs) {
    const cid = m.conversationId as string;
    if (!msgIdsByConv.has(cid)) msgIdsByConv.set(cid, new Set());
    msgIdsByConv.get(cid)!.add(m.messageId as string);
  }

  const allUserMsgIds = [...new Set(userMsgs.map(m => m.messageId as string))];
  const ads = await db.collection('adevents')
    .find({ userId, messageId: { $in: allUserMsgIds }, eventType: 'impression' })
    .project({ messageId: 1 })
    .toArray();
  const adMessageIds = new Set(ads.map(a => a.messageId as string));

  return convos.map(c => {
    const cid = c.conversationId as string;
    const msgSet = msgIdsByConv.get(cid) ?? new Set();
    let adCount = 0;
    for (const mid of msgSet) if (adMessageIds.has(mid)) adCount++;
    return {
      conversationId: cid,
      title: (c.title as string) ?? '(untitled)',
      createdAt: (c.createdAt as Date).toISOString(),
      adCount,
    };
  });
}

function flattenContent(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) {
    if (block && typeof block === 'object' && (block as any).type === 'text' && typeof (block as any).text === 'string') {
      parts.push((block as any).text);
    } else {
      parts.push('[non-text content]');
    }
  }
  return parts.join('\n');
}

export async function getConversationThread(
  db: Db,
  userId: ObjectId,
  conversationId: string,
): Promise<ThreadMessage[]> {
  const msgs = await db.collection('messages')
    .find({ conversationId })
    .sort({ createdAt: 1 })
    .toArray();

  const userMsgIds = msgs.filter(m => m.isCreatedByUser).map(m => m.messageId as string);
  const ads = userMsgIds.length
    ? await db.collection('adevents')
        .find({ userId, messageId: { $in: userMsgIds } })
        .sort({ timestamp: 1 })
        .toArray()
    : [];

  const adsByMsg = new Map<string, any[]>();
  for (const a of ads) {
    const key = a.messageId as string;
    if (!adsByMsg.has(key)) adsByMsg.set(key, []);
    adsByMsg.get(key)!.push(a);
  }

  return msgs.map(m => {
    const base: ThreadMessage = {
      messageId: m.messageId as string,
      isCreatedByUser: !!m.isCreatedByUser,
      sender: (m.sender as string) ?? (m.isCreatedByUser ? 'User' : 'Assistant'),
      text: (m.text as string) || flattenContent(m.content),
      createdAt: (m.createdAt as Date).toISOString(),
    };
    if (m.isCreatedByUser) {
      const group = adsByMsg.get(m.messageId as string) ?? [];
      if (group.length > 0) {
        const variant = group[0].variant as string;
        const pairs = pairDurations(
          group.map(ev => ({
            userId: userId.toString(),
            messageId: m.messageId as string,
            eventType: ev.eventType as string,
            timestamp: ev.timestamp as Date,
          })),
          'hover_start', 'hover_end', 60_000,
        );
        const totalHoverMs = pairs.durations.reduce((a, b) => a + b, 0);
        base.adOverlay = {
          variant,
          events: group.map(ev => ({
            eventType: ev.eventType as string,
            timestamp: (ev.timestamp as Date).toISOString(),
          })),
          totalHoverMs,
        };
      }
    }
    return base;
  });
}

export async function getResponseViewRate(db: Db): Promise<ResponseViewRateRow[]> {
  const rows = await db.collection('adevents').aggregate<{
    _id: string; viewed: number; total: number;
  }>([
    {
      $match: {
        studyId: STUDY_ID,
        variant: { $in: VARIANTS as unknown as string[] },
        eventType: { $in: RESPONSE_EVENT_TYPES as unknown as string[] },
      },
    },
    {
      $group: {
        _id: { variant: '$variant', messageId: '$messageId' },
        eventTypes: { $addToSet: '$eventType' },
      },
    },
    {
      $group: {
        _id: '$_id.variant',
        viewed: {
          $sum: { $cond: [{ $in: ['response_viewport_enter', '$eventTypes'] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
  ]).toArray();

  return VARIANTS.map(variant => {
    const row = rows.find(r => r._id === variant);
    const messagesViewed = row?.viewed ?? 0;
    const totalMessages = row?.total ?? 0;
    return {
      variant,
      messagesViewed,
      totalMessages,
      rate: totalMessages > 0 ? messagesViewed / totalMessages : 0,
    };
  });
}

const RESPONSE_DWELL_MAX_MS = 60_000;

export type ResponseDwellFilters = { from?: Date; to?: Date };

export async function getResponseDwellStats(
  db: Db,
  filters: ResponseDwellFilters,
): Promise<ResponseDwellSummary[]> {
  const match: Record<string, unknown> = {
    studyId: STUDY_ID,
    variant: { $in: VARIANTS as unknown as string[] },
    eventType: { $in: ['response_viewport_enter', 'response_viewport_exit'] },
  };
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to)   range.$lte = filters.to;
    match.timestamp = range;
  }

  const events = await db.collection('adevents')
    .find(match)
    .project({ userId: 1, messageId: 1, eventType: 1, timestamp: 1, variant: 1 })
    .sort({ userId: 1, messageId: 1, timestamp: 1 })
    .toArray();

  const result: ResponseDwellSummary[] = [];
  for (const variant of VARIANTS) {
    const filtered = events
      .filter(ev => ev.variant === variant)
      .map(ev => ({
        userId:    (ev.userId as { toString(): string }).toString(),
        messageId: ev.messageId as string,
        eventType: ev.eventType as string,
        timestamp: ev.timestamp as Date,
      }));
    const { durations, excluded } = pairDurations(
      filtered,
      'response_viewport_enter',
      'response_viewport_exit',
      RESPONSE_DWELL_MAX_MS,
    );
    durations.sort((a, b) => a - b);
    result.push({
      variant,
      n: durations.length,
      median: durations.length ? percentile(durations, 50) : 0,
      p25:    durations.length ? percentile(durations, 25) : 0,
      p75:    durations.length ? percentile(durations, 75) : 0,
      p95:    durations.length ? percentile(durations, 95) : 0,
      excludedOutliers: excluded,
      histogram: bucketResponseDurations(durations),
    });
  }
  return result;
}

function bucketResponseDurations(sorted: number[]): Array<{ bucket: string; count: number }> {
  const buckets: Array<{ bucket: string; max: number }> = [
    { bucket: '0–500ms',   max: 500 },
    { bucket: '500ms–1s',  max: 1000 },
    { bucket: '1–2s',      max: 2000 },
    { bucket: '2–5s',      max: 5000 },
    { bucket: '5–10s',     max: 10_000 },
    { bucket: '10–30s',    max: 30_000 },
    { bucket: '30–60s',    max: 60_000 },
  ];
  const counts = buckets.map(b => ({ bucket: b.bucket, count: 0 }));
  for (const d of sorted) {
    const idx = buckets.findIndex(b => d <= b.max);
    if (idx >= 0) counts[idx].count++;
  }
  return counts;
}

export async function getScrollDepthStats(db: Db): Promise<ScrollDepthSummary[]> {
  const events = await db.collection('adevents').aggregate<{
    variant: string; scrollDepthPercent: number;
  }>([
    {
      $match: {
        studyId: STUDY_ID,
        eventType: 'response_viewport_exit',
        variant: { $in: VARIANTS as unknown as string[] },
        scrollDepthPercent: { $exists: true, $gte: 0, $lte: 100 },
      },
    },
    { $project: { variant: 1, scrollDepthPercent: 1, _id: 0 } },
  ]).toArray();

  const result: ScrollDepthSummary[] = [];
  for (const variant of VARIANTS) {
    const depths = events
      .filter(e => e.variant === variant)
      .map(e => e.scrollDepthPercent)
      .sort((a, b) => a - b);
    result.push({
      variant,
      n: depths.length,
      median: depths.length ? percentile(depths, 50) : 0,
      p25:    depths.length ? percentile(depths, 25) : 0,
      p75:    depths.length ? percentile(depths, 75) : 0,
      histogram: bucketScrollDepth(depths),
    });
  }
  return result;
}

function bucketScrollDepth(sorted: number[]): Array<{ bucket: string; count: number }> {
  const counts = Array.from({ length: 10 }, (_, i) => ({
    bucket: `${i * 10}–${(i + 1) * 10}`,
    count: 0,
  }));
  for (const d of sorted) {
    const idx = Math.min(9, Math.max(0, Math.floor(d / 10)));
    counts[idx].count++;
  }
  return counts;
}

export async function getResponseLinkClickStats(db: Db): Promise<LinkClickStats> {
  const clickAgg = await db.collection('adevents').aggregate<{
    _id: string; count: number; urls: string[];
  }>([
    {
      $match: {
        studyId: STUDY_ID,
        eventType: 'response_link_click',
        variant: { $in: VARIANTS as unknown as string[] },
      },
    },
    {
      $group: {
        _id: '$variant',
        count: { $sum: 1 },
        urls: { $push: '$linkUrl' },
      },
    },
  ]).toArray();

  const viewedAgg = await db.collection('adevents').aggregate<{ _id: string; count: number }>([
    {
      $match: {
        studyId: STUDY_ID,
        eventType: 'response_viewport_enter',
        variant: { $in: VARIANTS as unknown as string[] },
      },
    },
    { $group: { _id: { variant: '$variant', messageId: '$messageId' } } },
    { $group: { _id: '$_id.variant', count: { $sum: 1 } } },
  ]).toArray();

  const rates = VARIANTS.map(variant => {
    const clicks = clickAgg.find(r => r._id === variant)?.count ?? 0;
    const viewedMessages = viewedAgg.find(r => r._id === variant)?.count ?? 0;
    return {
      variant,
      clicks,
      viewedMessages,
      rate: viewedMessages > 0 ? clicks / viewedMessages : 0,
    };
  });

  const allUrls = clickAgg.flatMap(r => r.urls ?? []);
  const domainCounts = new Map<string, number>();
  for (const url of allUrls) {
    const host = hostnameFromUrl(url);
    if (host) domainCounts.set(host, (domainCounts.get(host) ?? 0) + 1);
  }
  const topDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { rates, topDomains };
}
