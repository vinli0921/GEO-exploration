import { getMongo } from '@/lib/mongo';
import {
  getResponseViewRate,
  getResponseDwellStats,
  getScrollDepthStats,
  getResponseLinkClickStats,
} from '@/lib/ads/queries';
import { wilsonCI, newcombeDiffCI } from '@/lib/ads/stats';
import { VariantBadge } from '@/components/ads/variant-badge';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdsEngagementPage() {
  const db = await getMongo();
  const [viewRates, dwell, scroll, linkClicks] = await Promise.all([
    getResponseViewRate(db),
    getResponseDwellStats(db, {}),
    getScrollDepthStats(db),
    getResponseLinkClickStats(db),
  ]);

  const control = viewRates.find(r => r.variant === 'control');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Response view rate</h2>
        <div className="grid grid-cols-3 gap-4">
          {viewRates.map(r => {
            const ci = r.totalMessages > 0 ? wilsonCI(r.messagesViewed, r.totalMessages) : null;
            const diff =
              control && r.variant !== 'control' && r.totalMessages > 0 && control.totalMessages > 0
                ? newcombeDiffCI(r.messagesViewed, r.totalMessages, control.messagesViewed, control.totalMessages)
                : null;
            return (
              <Card key={r.variant} className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <VariantBadge variant={r.variant} />
                </div>
                <p className="text-2xl font-bold">{(r.rate * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {r.messagesViewed} / {r.totalMessages} messages
                </p>
                {ci && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    95% CI: [{(ci.lower * 100).toFixed(1)}%, {(ci.upper * 100).toFixed(1)}%]
                  </p>
                )}
                {diff && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    vs. control: {(diff.point * 100).toFixed(1)}pp [{(diff.lower * 100).toFixed(1)}, {(diff.upper * 100).toFixed(1)}]
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Response dwell time</h2>
        <div className="grid grid-cols-3 gap-4">
          {dwell.map(r => (
            <Card key={r.variant} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <VariantBadge variant={r.variant} />
              </div>
              <p className="text-xs text-muted-foreground">
                n={r.n} · p25={r.p25.toFixed(0)}ms · p50={r.median.toFixed(0)}ms · p75={r.p75.toFixed(0)}ms
              </p>
              {r.excludedOutliers > 0 && (
                <p className="text-xs text-muted-foreground">{r.excludedOutliers} outlier(s) excluded ({'>'}60s)</p>
              )}
              <table className="mt-3 w-full text-xs">
                <tbody>
                  {r.histogram.map(b => (
                    <tr key={b.bucket} className="border-b last:border-0">
                      <td className="py-1 text-muted-foreground">{b.bucket}</td>
                      <td className="py-1 text-right font-mono">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Scroll depth</h2>
        <div className="grid grid-cols-3 gap-4">
          {scroll.map(r => (
            <Card key={r.variant} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <VariantBadge variant={r.variant} />
              </div>
              <p className="text-xs text-muted-foreground">
                n={r.n} · p25={r.p25.toFixed(0)}% · p50={r.median.toFixed(0)}% · p75={r.p75.toFixed(0)}%
              </p>
              <table className="mt-3 w-full text-xs">
                <tbody>
                  {r.histogram.map(b => (
                    <tr key={b.bucket} className="border-b last:border-0">
                      <td className="py-1 text-muted-foreground">{b.bucket}%</td>
                      <td className="py-1 text-right font-mono">{b.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Response link clicks</h2>
        <div className="grid grid-cols-3 gap-4">
          {linkClicks.rates.map(r => (
            <Card key={r.variant} className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <VariantBadge variant={r.variant} />
              </div>
              <p className="text-2xl font-bold">{(r.rate * 100).toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {r.clicks} click(s) / {r.viewedMessages} viewed message(s)
              </p>
            </Card>
          ))}
        </div>
        {linkClicks.topDomains.length > 0 && (
          <Card className="mt-4 p-4">
            <h3 className="mb-2 text-sm font-semibold">Top clicked domains</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Domain</th>
                  <th className="pb-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {linkClicks.topDomains.map(d => (
                  <tr key={d.domain} className="border-b last:border-0">
                    <td className="py-2 font-mono text-xs">{d.domain}</td>
                    <td className="py-2 text-right">{d.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
