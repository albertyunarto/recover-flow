"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeightEntry } from "@/types";

export function WeightChart({
  entries,
  targetWeight,
  startWeight,
}: {
  entries: WeightEntry[];
  targetWeight: number;
  startWeight: number;
}) {
  const data = entries.map((e) => ({
    date: new Date(e.date).toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
    }),
    weight: parseFloat(String(e.weight_kg)),
  }));

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No weight data yet. Log your first weigh-in!
      </div>
    );
  }

  const minWeight = Math.min(
    targetWeight - 2,
    ...data.map((d) => d.weight)
  );
  const maxWeight = Math.max(startWeight + 2, ...data.map((d) => d.weight));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
        />
        <YAxis
          domain={[Math.floor(minWeight), Math.ceil(maxWeight)]}
          tick={{ fontSize: 10 }}
          tickLine={false}
          unit=" kg"
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(214 32% 91%)",
          }}
          formatter={(value) => [`${value} kg`, "Weight"]}
        />
        <ReferenceLine
          y={targetWeight}
          stroke="hsl(142, 71%, 45%)"
          strokeDasharray="5 5"
          label={{
            value: `Target: ${targetWeight}kg`,
            position: "right",
            fontSize: 10,
            fill: "hsl(142, 71%, 45%)",
          }}
        />
        <ReferenceLine
          y={startWeight}
          stroke="hsl(0, 0%, 70%)"
          strokeDasharray="3 3"
          label={{
            value: `Start: ${startWeight}kg`,
            position: "right",
            fontSize: 10,
            fill: "hsl(0, 0%, 60%)",
          }}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="hsl(221, 83%, 53%)"
          strokeWidth={2}
          dot={{ r: 4, fill: "hsl(221, 83%, 53%)" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
