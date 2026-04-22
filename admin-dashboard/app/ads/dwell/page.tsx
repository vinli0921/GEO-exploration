import { getMongo } from '@/lib/mongo';
import { getDwellStats } from '@/lib/ads/queries';
import { DwellHistogram } from '@/components/ads/dwell-histogram';
import { Card } from '@/components/ui/card';
import { ObjectId } from 'mongodb';
import { pairDurations } from '@/lib/ads/pairing';

export const dynamic = 'force-dynamic';

const EDGES = [0, 100, 250, 500, 1000, 2500, 5000, 10_000, 30_000, 60_000];

function bucket(values: number[]) {
  const counts = new Array(EDGES.length).fill(0);
  for (const v of values) {
    let i = EDGES.findIndex((e, idx) => idx + 1 === EDGES.length || (v >= e && v < EDGES[idx + 1]));
    if (i < 0) i = EDGES.length - 1;
    counts[i]++;
  }
  return counts;
}

function labelFor(i: number) {
  if (i === EDGES.length - 1) return `${EDGES[i]}ms+`;
  return `${EDGES[i]}–${EDGES[i + 1]}ms`;
}

export default async function DwellPage() {
  const db = await getMongo();
  const summaries = await getDwellStats(db, {});

  const events = await db.collection('adevents')
    .find({
      studyId: 'study-1',
      variant: { $in: ['sponsored-inline', 'sponsored-outside'] },
      eventType: { $in: ['hover_start', 'hover_end', 'viewport_enter', 'viewport_exit'] },
    })
    .project({ userId: 1, messageId: 1, eventType: 1, timestamp: 1, variant: 1 })
    .toArray();

  function durs(variant: string, s: string, e: string) {
    const filtered = events
      .filter(ev => ev.variant === variant)
      .map(ev => ({
        userId: (ev.userId as ObjectId).toString(),
        messageId: ev.messageId as string,
        eventType: ev.eventType as string,
        timestamp: ev.timestamp as Date,
      }));
    return pairDurations(filtered, s, e, 60_000).durations;
  }

  const hoverInline   = durs('sponsored-inline',  'hover_start',    'hover_end');
  const hoverOutside  = durs('sponsored-outside', 'hover_start',    'hover_end');
  const viewInline    = durs('sponsored-inline',  'viewport_enter', 'viewport_exit');
  const viewOutside   = durs('sponsored-outside', 'viewport_enter', 'viewport_exit');

  const hoverInlineBins  = bucket(hoverInline);
  const hoverOutsideBins = bucket(hoverOutside);
  const viewInlineBins   = bucket(viewInline);
  const viewOutsideBins  = bucket(viewOutside);

  const hoverBins = hoverInlineBins.map((_, i) => ({
    bucketLabel: labelFor(i),
    inline: hoverInlineBins[i],
    outside: hoverOutsideBins[i],
  }));
  const viewBins = viewInlineBins.map((_, i) => ({
    bucketLabel: labelFor(i),
    inline: viewInlineBins[i],
    outside: viewOutsideBins[i],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {summaries.map(s => (
          <Card key={`${s.variant}-${s.metric}`} className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{s.metric} · {s.variant.replace('sponsored-', '')}</p>
            <p className="text-2xl font-bold">{Math.round(s.median)}ms</p>
            <p className="text-xs text-muted-foreground">
              n={s.n} · p25={Math.round(s.p25)} · p75={Math.round(s.p75)} · p95={Math.round(s.p95)}
            </p>
            {s.excludedOutliers > 0 && (
              <p className="mt-1 text-[10px] text-amber-700">{s.excludedOutliers} outlier(s) &gt; 60s excluded</p>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <DwellHistogram bins={hoverBins} title="Hover duration distribution" />
      </Card>

      <Card className="p-4">
        <DwellHistogram bins={viewBins} title="Viewport duration distribution" />
      </Card>
    </div>
  );
}
