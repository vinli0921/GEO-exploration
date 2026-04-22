import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMongo } from '@/lib/mongo';
import { getEventsPage } from '@/lib/ads/queries';

const schema = z.object({
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  after: z.string().optional(),
  variant: z.enum(['sponsored-inline', 'sponsored-outside']).optional(),
  eventType: z.enum(['impression', 'viewport_enter', 'viewport_exit', 'hover_start', 'hover_end', 'link_visit']).optional(),
  queryText: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const db = await getMongo();
  const { from, to, ...rest } = parsed.data;
  const result = await getEventsPage(db, {
    ...rest,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return NextResponse.json(result);
}
