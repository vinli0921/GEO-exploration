import { getMongo } from '@/lib/mongo';
import { getEnrollment, getFunnelTotals, getLatestEvents, getDailyTimeseries } from '@/lib/ads/queries';
import { VariantBadge } from '@/components/ads/variant-badge';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdsOverviewPage() {
  const db = await getMongo();
  const [enrollment, totals, latest, timeseries] = await Promise.all([
    getEnrollment(db),
    getFunnelTotals(db),
    getLatestEvents(db, 10),
    getDailyTimeseries(db),
  ]);

  const byVE = (v: string, e: string) =>
    totals.find(t => t.variant === v && t.eventType === e)?.count ?? 0;
  const impressions = totals.filter(t => t.eventType === 'impression').reduce((s, t) => s + t.count, 0);
  const hovers      = totals.filter(t => t.eventType === 'hover_start').reduce((s, t) => s + t.count, 0);
  const clicks      = totals.filter(t => t.eventType === 'link_visit').reduce((s, t) => s + t.count, 0);
  const hoverRate   = impressions ? (hovers / impressions) * 100 : 0;
  const clickRate   = impressions ? (clicks / impressions) * 100 : 0;
  const totalUsers  = enrollment.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Enrolled users</p>
          <p className="text-2xl font-bold">{totalUsers}</p>
          <p className="text-xs text-muted-foreground">{enrollment.map(e => `${e.variant.replace('sponsored-', '')}: ${e.count}`).join(' · ')}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Impressions</p>
          <p className="text-2xl font-bold">{impressions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">inline: {byVE('sponsored-inline','impression')} · outside: {byVE('sponsored-outside','impression')}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Hover rate</p>
          <p className="text-2xl font-bold">{hoverRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{hovers} / {impressions}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Link-visit rate</p>
          <p className="text-2xl font-bold">{clickRate.toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">{clicks} / {impressions}</p></Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Daily activity</h2>
        <TimeseriesChart rows={timeseries} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Latest 10 events</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="pb-2">Time</th><th>User</th><th>Variant</th><th>Event</th><th>Query</th>
          </tr></thead>
          <tbody>
            {latest.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="font-mono text-xs">{r.pseudonym}</td>
                <td><VariantBadge variant={r.variant} /></td>
                <td className="font-mono text-xs">{r.eventType}</td>
                <td className="max-w-xs truncate">{r.queryText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function TimeseriesChart({ rows }: { rows: { date: string; variant: string; eventType: string; count: number }[] }) {
  const dates = [...new Set(rows.map(r => r.date))].sort();
  const impByDate = (v: string) => {
    const map = new Map<string, number>();
    rows.filter(r => r.variant === v && r.eventType === 'impression').forEach(r => map.set(r.date, r.count));
    return map;
  };
  const inline  = impByDate('sponsored-inline');
  const outside = impByDate('sponsored-outside');
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
        <th className="pb-2">Date</th><th>Inline impressions</th><th>Outside impressions</th>
      </tr></thead>
      <tbody>
        {dates.map(d => (
          <tr key={d} className="border-b last:border-0">
            <td className="py-2 font-mono text-xs">{d}</td>
            <td>{inline.get(d) ?? 0}</td>
            <td>{outside.get(d) ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
