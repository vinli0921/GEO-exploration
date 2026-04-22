import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMongo } from '@/lib/mongo';
import { resolveUserByPseudonym, getUserConversations, getConversationThread } from '@/lib/ads/queries';
import { toErrorResponse } from '@/lib/ads/api-error';

const querySchema = z.object({
  conversationId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } },
) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const db = await getMongo();
    const userId = await resolveUserByPseudonym(db, params.userId);
    if (!userId) return NextResponse.json({ error: 'user not found' }, { status: 404 });

    const conversations = await getUserConversations(db, userId);
    let thread = null;
    if (parsed.data.conversationId) {
      thread = await getConversationThread(db, userId, parsed.data.conversationId);
    }

    return NextResponse.json({ conversations, thread });
  } catch (err) {
    return toErrorResponse(err, `GET /api/ads/conversations/${params.userId}`);
  }
}
