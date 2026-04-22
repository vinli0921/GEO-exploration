import { VariantBadge } from './variant-badge';
import type { ThreadMessage } from '@/lib/ads/types';

export function AdOverlayCard({ overlay }: { overlay: NonNullable<ThreadMessage['adOverlay']> }) {
  return (
    <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Ad fired</span>
        <VariantBadge variant={overlay.variant} />
        <span className="text-muted-foreground">Total hover: {overlay.totalHoverMs}ms</span>
      </div>
      <ol className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
        {overlay.events.map((e, i) => (
          <li key={i} className="rounded bg-white px-1.5 py-0.5">
            {new Date(e.timestamp).toLocaleTimeString()} · {e.eventType}
          </li>
        ))}
      </ol>
    </div>
  );
}
