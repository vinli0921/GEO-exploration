import { getMongo } from '@/lib/mongo';
import { getFunnelStats } from '@/lib/ads/queries';
import { wilsonCI, newcombeDiffCI } from '@/lib/ads/stats';
import { FunnelChart } from '@/components/ads/funnel-chart';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function FunnelPage() {
  const db = await getMongo();
  const rows = await getFunnelStats(db, {});
  const inline  = rows.find(r => r.variant === 'sponsored-inline')!;
  const outside = rows.find(r => r.variant === 'sponsored-outside')!;

  const chartRows = [
    { stage: 'Impression',      inline: inline.impressions, outside: outside.impressions },
    { stage: 'Viewport entered', inline: inline.viewports,  outside: outside.viewports },
    { stage: 'Hovered',         inline: inline.hovers,     outside: outside.hovers },
    { stage: 'Link visited',    inline: inline.clicks,     outside: outside.clicks },
  ];

  const stages: Array<['impressions' | 'viewports' | 'hovers' | 'clicks', string]> = [
    ['viewports', 'Viewport / Impression'],
    ['hovers',    'Hover / Impression'],
    ['clicks',    'Link-visit / Impression'],
  ];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Funnel</h2>
        <FunnelChart rows={chartRows} />
      </Card>

      <Card className="p-4">
        <h2 className="mb-4 text-lg font-semibold">Rates with 95% confidence intervals</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="pb-2">Stage</th><th>Inline</th><th>Outside</th><th>Δ (Newcombe 95%)</th>
          </tr></thead>
          <tbody>
            {stages.map(([key, label]) => {
              const wInline  = wilsonCI(inline[key],  inline.impressions);
              const wOutside = wilsonCI(outside[key], outside.impressions);
              const d = newcombeDiffCI(inline[key], inline.impressions, outside[key], outside.impressions);
              return (
                <tr key={key} className="border-b last:border-0">
                  <td className="py-2">{label}</td>
                  <td>{(wInline.point  * 100).toFixed(2)}% <span className="text-xs text-muted-foreground">[{(wInline.lower*100).toFixed(1)}, {(wInline.upper*100).toFixed(1)}]</span></td>
                  <td>{(wOutside.point * 100).toFixed(2)}% <span className="text-xs text-muted-foreground">[{(wOutside.lower*100).toFixed(1)}, {(wOutside.upper*100).toFixed(1)}]</span></td>
                  <td>{(d.point * 100).toFixed(2)} pp <span className="text-xs text-muted-foreground">[{(d.lower*100).toFixed(1)}, {(d.upper*100).toFixed(1)}]</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {inline.clicks + outside.clicks < 30 && (
          <p className="mt-4 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            ⚠ Only {inline.clicks + outside.clicks} link-visit events across both variants. Link-visit rate CIs will be wide; interpret with care.
          </p>
        )}
      </Card>
    </div>
  );
}
