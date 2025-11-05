"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { EventTypeDistribution } from "@/lib/api"
import { Pie, PieChart, Cell, Legend, ResponsiveContainer } from "recharts"

interface EventDistributionChartProps {
  data: EventTypeDistribution[]
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(210, 100%, 50%)",
  "hsl(150, 70%, 50%)",
  "hsl(30, 100%, 50%)",
  "hsl(270, 70%, 60%)",
  "hsl(330, 80%, 60%)",
  "hsl(180, 70%, 50%)",
  "hsl(60, 100%, 50%)",
]

export function EventDistributionChart({ data }: EventDistributionChartProps) {
  const chartConfig: ChartConfig = data.reduce((acc, item, index) => {
    acc[item.event_type] = {
      label: item.event_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      color: COLORS[index % COLORS.length],
    }
    return acc
  }, {} as ChartConfig)

  const chartData = data.map((item, index) => ({
    name: item.event_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: item.count,
    fill: COLORS[index % COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Type Distribution</CardTitle>
        <CardDescription>Breakdown of event types across all sessions</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
