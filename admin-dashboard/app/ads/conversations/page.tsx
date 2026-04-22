import Link from 'next/link';
import { getMongo } from '@/lib/mongo';
import { getUserList } from '@/lib/ads/queries';
import { VariantBadge } from '@/components/ads/variant-badge';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function ConversationsListPage() {
  const db = await getMongo();
  const users = await getUserList(db);
  return (
    <Card className="p-4">
      <h2 className="mb-4 text-lg font-semibold">Users in study</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground">
            <th className="px-3 py-2">User</th><th>Variant</th><th>Conversations</th><th>Messages</th><th>Impressions</th><th>Hovers</th><th>Link visits</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.pseudonym} className="border-b last:border-0 hover:bg-accent/50">
                <td className="px-3 py-2">
                  <Link className="font-mono text-xs underline" href={`/ads/conversations/${u.pseudonym}`}>
                    {u.pseudonym}
                  </Link>
                </td>
                <td>{u.variant && <VariantBadge variant={u.variant} />}</td>
                <td>{u.conversationCount}</td>
                <td>{u.messageCount}</td>
                <td>{u.impressions}</td>
                <td>{u.hovers}</td>
                <td>{u.linkVisits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
