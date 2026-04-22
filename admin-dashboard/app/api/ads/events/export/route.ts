import { NextRequest } from 'next/server';
import { stringify } from 'csv-stringify';
import { z } from 'zod';
import { getMongo } from '@/lib/mongo';
import { streamEventsForExport } from '@/lib/ads/queries';
import { AD_EVENT_CSV_HEADER, formatAdEventRow } from '@/lib/ads/csv';
import { toErrorResponse } from '@/lib/ads/api-error';

const schema = z.object({
  variant: z.enum(['sponsored-inline', 'sponsored-outside']).optional(),
  eventType: z.enum(['impression', 'viewport_enter', 'viewport_exit', 'hover_start', 'hover_end', 'link_visit']).optional(),
  queryText: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
  let db;
  try {
    db = await getMongo();
  } catch (err) {
    return toErrorResponse(err, 'GET /api/ads/events/export (setup)');
  }
  const { from, to, ...rest } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      const csv = stringify({ header: false });
      csv.on('data', chunk => controller.enqueue(chunk));
      csv.on('end', () => controller.close());
      csv.on('error', err => controller.error(err));

      csv.write(AD_EVENT_CSV_HEADER as unknown as string[]);
      for await (const row of streamEventsForExport(db, {
        ...rest,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      })) {
        csv.write(formatAdEventRow({
          timestamp: new Date(row.timestamp),
          pseudonym: row.pseudonym,
          variant: row.variant,
          eventType: row.eventType,
          conversationId: row.conversationId,
          messageId: row.messageId,
          queryText: row.queryText,
        }));
      }
      csv.end();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ad-events-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
