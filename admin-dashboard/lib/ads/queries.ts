import type { Db } from 'mongodb';
import { pseudonym } from '../pseudonym';
import type {
  EnrollmentRow, FunnelTotalsRow, TimeseriesRow, LatestEventDto, FunnelStatsRow,
} from './types';

const STUDY_ID = 'study-1';

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
