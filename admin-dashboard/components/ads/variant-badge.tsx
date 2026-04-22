import { cn } from '@/lib/utils';

export function VariantBadge({ variant, className }: { variant: string; className?: string }) {
  const palette: Record<string, string> = {
    'control':           'bg-gray-100 text-gray-700 border-gray-200',
    'sponsored-inline':  'bg-blue-100 text-blue-700 border-blue-200',
    'sponsored-outside': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
      palette[variant] ?? 'bg-gray-100 text-gray-700', className)}>
      {variant}
    </span>
  );
}
