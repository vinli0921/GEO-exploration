import { NextRequest } from 'next/server';
import { stringify } from 'csv-stringify';
import { z } from 'zod';
import { getMongo } from '@/lib/mongo';
import { streamMessagesForExport } from '@/lib/ads/queries';
import { MESSAGE_CSV_HEADER, formatMessageRow } from '@/lib/ads/csv';
import { toErrorResponse } from '@/lib/ads/api-error';

const schema = z.object({
  variant: z.enum(['control', 'sponsored-inline', 'sponsored-outside']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let db;
  try {
    db = await getMongo();
  } catch (err) {
    return toErrorResponse(err, 'GET /api/ads/messages/export (setup)');
  }
  const { variant, from, to } = parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      const csv = stringify({ header: false });
      csv.on('data', chunk => controller.enqueue(chunk));
      csv.on('end', () => controller.close());
      csv.on('error', err => controller.error(err));

      csv.write(MESSAGE_CSV_HEADER as unknown as string[]);
      for await (const row of streamMessagesForExport(db, {
        variant,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      })) {
        csv.write(formatMessageRow(row));
      }
      csv.end();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="study1-messages-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
