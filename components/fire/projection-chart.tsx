"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionYear } from "@/types";
import { formatSGD, formatSGDShort } from "@/lib/utils";

const BLUE = "hsl(221, 83%, 53%)";
const PURPLE = "hsl(262, 83%, 58%)";

export function ProjectionChart({
  series,
  retireAge,
  payoutAge = 65,
}: {
  series: ProjectionYear[];
  retireAge: number;
  payoutAge?: number;
}) {
  const data = series.map((p) => ({
    age: p.age,
    liquid: Math.round(p.invested + (p.spendable - p.invested - p.cpfLiquid)), // invested + cash
    cpf: Math.round(p.cpf),
  }));

  const showPayoutLine = payoutAge >= series[0]?.age && payoutAge <= series[series.length - 1]?.age;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.7} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="fillCpf" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PURPLE} stopOpacity={0.6} />
            <stop offset="100%" stopColor={PURPLE} stopOpacity={0.12} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" vertical={false} />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 10 }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tickFormatter={(a) => `${a}`}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          width={44}
          tickFormatter={(v) => formatSGDShort(v)}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid hsl(214 32% 91%)",
          }}
          labelFormatter={(age) => `Age ${age}`}
          formatter={(value, name) => [
            formatSGD(Number(value)),
            name === "liquid" ? "Investments + cash" : "CPF",
          ]}
        />
        <Area
          type="monotone"
          dataKey="liquid"
          stackId="nw"
          stroke={BLUE}
          strokeWidth={2}
          fill="url(#fillLiquid)"
        />
        <Area
          type="monotone"
          dataKey="cpf"
          stackId="nw"
          stroke={PURPLE}
          strokeWidth={2}
          fill="url(#fillCpf)"
        />
        <ReferenceLine
          x={retireAge}
          stroke="hsl(142, 71%, 45%)"
          strokeDasharray="4 4"
          label={{ value: `Retire ${retireAge}`, position: "top", fontSize: 10, fill: "hsl(142, 71%, 40%)" }}
        />
        {showPayoutLine && (
          <ReferenceLine
            x={payoutAge}
            stroke="hsl(38, 92%, 50%)"
            strokeDasharray="2 2"
            label={{ value: "CPF LIFE", position: "top", fontSize: 10, fill: "hsl(38, 92%, 45%)" }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
