import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ConversationThread } from '@/components/ads/conversation-thread';

export default function UserConversationsPage({ params }: { params: { userId: string } }) {
  return (
    <div className="space-y-4">
      <Link className="text-sm text-muted-foreground underline" href="/ads/conversations">← All users</Link>
      <Card className="p-4">
        <h2 className="mb-4 font-mono text-lg">{params.userId}</h2>
        <ConversationThread userId={params.userId} />
      </Card>
    </div>
  );
}
