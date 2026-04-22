import type { Db } from 'mongodb';
import { pseudonym } from '../pseudonym';
import type {
  EnrollmentRow, FunnelTotalsRow, TimeseriesRow, LatestEventDto,
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
