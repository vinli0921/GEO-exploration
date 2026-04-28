'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VariantBadge } from '@/components/ads/variant-badge';
import type { EventBrowserRow } from '@/lib/ads/types';

export function EventTable() {
  const [rows, setRows] = useState<EventBrowserRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [variant, setVariant] = useState('');
  const [eventType, setEventType] = useState('');
  const [queryText, setQueryText] = useState('');

  async function loadFirstPage() {
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50' });
    if (variant) params.set('variant', variant);
    if (eventType) params.set('eventType', eventType);
    if (queryText) params.set('queryText', queryText);
    const res = await fetch(`/api/ads/events?${params}`);
    const j = await res.json();
    setRows(j.rows);
    setCursor(j.nextCursor);
    setLoading(false);
  }

  async function loadMore() {
    if (!cursor) return;
    setLoading(true);
    const params = new URLSearchParams({ pageSize: '50', after: cursor });
    if (variant) params.set('variant', variant);
    if (eventType) params.set('eventType', eventType);
    if (queryText) params.set('queryText', queryText);
    const res = await fetch(`/api/ads/events?${params}`);
    const j = await res.json();
    setRows(prev => [...prev, ...j.rows]);
    setCursor(j.nextCursor);
    setLoading(false);
  }

  useEffect(() => { loadFirstPage(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function exportEventsCsv() {
    const params = new URLSearchParams();
    if (variant) params.set('variant', variant);
    if (eventType) params.set('eventType', eventType);
    if (queryText) params.set('queryText', queryText);
    window.location.href = `/api/ads/events/export?${params}`;
  }

  function exportMessagesCsv() {
    const params = new URLSearchParams();
    if (variant) params.set('variant', variant);
    window.location.href = `/api/ads/messages/export?${params}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><Label>Variant</Label>
          <select className="mt-1 block rounded border px-2 py-1 text-sm" value={variant} onChange={e => setVariant(e.target.value)}>
            <option value="">All</option>
            <option value="control">control</option>
            <option value="sponsored-inline">inline</option>
            <option value="sponsored-outside">outside</option>
          </select>
        </div>
        <div><Label>Event type</Label>
          <select className="mt-1 block rounded border px-2 py-1 text-sm" value={eventType} onChange={e => setEventType(e.target.value)}>
            <option value="">All</option>
            <option value="impression">impression</option>
            <option value="viewport_enter">viewport_enter</option>
            <option value="viewport_exit">viewport_exit</option>
            <option value="hover_start">hover_start</option>
            <option value="hover_end">hover_end</option>
            <option value="link_visit">link_visit</option>
          </select>
        </div>
        <div><Label>Query text contains</Label>
          <Input className="mt-1" value={queryText} onChange={e => setQueryText(e.target.value)} />
        </div>
        <Button onClick={loadFirstPage} disabled={loading}>Apply</Button>
        <Button variant="secondary" onClick={exportEventsCsv}>Events CSV</Button>
        <Button variant="secondary" onClick={exportMessagesCsv} title="Per-message conversation export (variant filter applies; eventType / query filters do not)">Messages CSV</Button>
      </div>

      <div className="overflow-x-auto rounded border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">Time</th><th>User</th><th>Variant</th><th>Event</th><th>Query</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-accent/50">
                <td className="px-3 py-2 font-mono text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                <td className="font-mono text-xs">{r.pseudonym}</td>
                <td><VariantBadge variant={r.variant} /></td>
                <td className="font-mono text-xs">{r.eventType}</td>
                <td className="max-w-md truncate" title={r.queryText}>{r.queryText}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center">
        {cursor && <Button variant="outline" onClick={loadMore} disabled={loading}>Load more</Button>}
        {!cursor && rows.length > 0 && <p className="text-sm text-muted-foreground">End of results ({rows.length} rows)</p>}
      </div>
    </div>
  );
}
