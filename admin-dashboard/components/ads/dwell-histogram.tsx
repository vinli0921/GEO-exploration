'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type BinRow = { bucketLabel: string; inline: number; outside: number };

export function DwellHistogram({ bins, title }: { bins: BinRow[]; title: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={bins}>
          <XAxis dataKey="bucketLabel" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" height={60} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="inline"  fill="#3b82f6" name="sponsored-inline" />
          <Bar dataKey="outside" fill="#a855f7" name="sponsored-outside" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
