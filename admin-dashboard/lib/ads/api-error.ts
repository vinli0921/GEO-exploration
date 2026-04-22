import { NextResponse } from 'next/server';

export function toErrorResponse(err: unknown, context: string): NextResponse {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ads-api] ${context}:`, err);
  return NextResponse.json(
    { error: 'internal_error', context, message },
    { status: 500 },
  );
}
