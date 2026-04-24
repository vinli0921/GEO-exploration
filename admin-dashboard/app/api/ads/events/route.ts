import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMongo } from '@/lib/mongo';
import { getEventsPage } from '@/lib/ads/queries';
import { toErrorResponse } from '@/lib/ads/api-error';

const schema = z.object({
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  after: z.string().optional(),
  variant: z.enum(['sponsored-inline', 'sponsored-outside']).optional(),
  eventType: z.enum([
    'impression',
    'viewport_enter', 'viewport_exit',
    'hover_start', 'hover_end',
    'link_visit',
    'response_viewport_enter', 'response_viewport_exit', 'response_link_click',
  ]).optional(),
  queryText: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const db = await getMongo();
    const { from, to, ...rest } = parsed.data;
    const result = await getEventsPage(db, {
      ...rest,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err, 'GET /api/ads/events');
  }
}
