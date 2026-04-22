'use client';
import { useEffect, useState } from 'react';
import type { ThreadConversation, ThreadMessage } from '@/lib/ads/types';
import { AdOverlayCard } from './ad-overlay-card';
import { cn } from '@/lib/utils';

export function ConversationThread({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<ThreadConversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/ads/conversations/${userId}`);
      const j = await res.json();
      setConversations(j.conversations);
      if (j.conversations[0]) setSelected(j.conversations[0].conversationId);
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/ads/conversations/${userId}?conversationId=${encodeURIComponent(selected)}`);
      const j = await res.json();
      setThread(j.thread);
      setLoading(false);
    })();
  }, [userId, selected]);

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4">
      <aside className="space-y-1 border-r pr-3">
        <h3 className="mb-2 text-sm font-semibold">Conversations</h3>
        {conversations.map(c => (
          <button
            key={c.conversationId}
            onClick={() => setSelected(c.conversationId)}
            className={cn(
              'w-full rounded p-2 text-left text-xs transition-colors',
              selected === c.conversationId ? 'bg-accent' : 'hover:bg-accent/50',
            )}
          >
            <p className="font-medium">{c.title}</p>
            <p className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()} · {c.adCount} ad{c.adCount === 1 ? '' : 's'}</p>
          </button>
        ))}
        {conversations.length === 0 && !loading && <p className="text-xs text-muted-foreground">No conversations</p>}
      </aside>

      <div className="space-y-3">
        {thread?.map((m, i) => (
          <div key={i} className={cn('max-w-2xl rounded-lg border p-3 text-sm', m.isCreatedByUser ? 'bg-card' : 'ml-auto bg-accent/30')}>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{m.sender}</span>
              <span>{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap">{m.text}</div>
            {m.adOverlay && <AdOverlayCard overlay={m.adOverlay} />}
          </div>
        ))}
        {!thread && !loading && <p className="text-sm text-muted-foreground">Select a conversation</p>}
      </div>
    </div>
  );
}
