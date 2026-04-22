'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Row = { stage: string; inline: number; outside: number };

export function FunnelChart({ rows }: { rows: Row[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={rows} layout="vertical" margin={{ left: 100, right: 20 }}>
        <XAxis type="number" />
        <YAxis type="category" dataKey="stage" />
        <Tooltip />
        <Bar dataKey="inline"  fill="#3b82f6" name="sponsored-inline" />
        <Bar dataKey="outside" fill="#a855f7" name="sponsored-outside" />
      </BarChart>
    </ResponsiveContainer>
  );
}
