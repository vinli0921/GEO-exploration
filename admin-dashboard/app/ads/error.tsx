'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ads-segment-error]', error);
  }, [error]);

  return (
    <Card className="p-6">
      <h2 className="mb-2 text-lg font-semibold">Ad study dashboard failed to load</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p className="mb-4 font-mono text-xs text-muted-foreground">
          digest: {error.digest}
        </p>
      )}
      <p className="mb-4 text-sm text-muted-foreground">
        Check Vercel function logs for details, and verify <code>MONGO_URI</code> and{' '}
        <code>PSEUDONYM_SECRET</code> are set on the current deployment.
      </p>
      <Button onClick={reset}>Retry</Button>
    </Card>
  );
}
