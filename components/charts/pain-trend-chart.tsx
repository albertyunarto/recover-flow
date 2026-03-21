"use client";

import { useState, useTransition, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getPainTrends } from "@/lib/actions/pain";
import { cn } from "@/lib/utils";
import type { PainEntry } from "@/types";

const REGIONS = [
  {
    key: "neck_score" as const,
    label: "Neck",
    color: "hsl(221 83% 53%)",
    hex: "#3b82f6",
  },
  {
    key: "back_score" as const,
    label: "Back",
    color: "hsl(262 83% 58%)",
    hex: "#8b5cf6",
  },
  {
    key: "elbow_score" as const,
    label: "Elbow",
    color: "hsl(38 92% 50%)",
    hex: "#f59e0b",
  },
  {
    key: "knee_score" as const,
    label: "Knee",
    color: "hsl(142 71% 45%)",
    hex: "#22c55e",
  },
] as const;

type Range = "7d" | "30d" | "all";

interface ChartDataPoint {
  date: string;
  displayDate: string;
  neck_score: number | null;
  back_score: number | null;
  elbow_score: number | null;
  knee_score: number | null;
}

function entriesToChartData(entries: PainEntry[]): ChartDataPoint[] {
  // Group by date, average AM + PM scores
  const byDate = new Map<string, PainEntry[]>();
  for (const entry of entries) {
    const existing = byDate.get(entry.date) ?? [];
    existing.push(entry);
    byDate.set(entry.date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayEntries]) => {
      function avg(
        key: "neck_score" | "back_score" | "elbow_score" | "knee_score"
      ): number | null {
        const vals = dayEntries
          .map((e) => e[key])
          .filter((v): v is number => v !== null);
        if (vals.length === 0) return null;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }

      const [year, month, day] = date.split("-");
      const displayDate = `${parseInt(month)}/${parseInt(day)}`;

      return {
        date,
        displayDate,
        neck_score: avg("neck_score"),
        back_score: avg("back_score"),
        elbow_score: avg("elbow_score"),
        knee_score: avg("knee_score"),
      };
    });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-card shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-3 py-0.5">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
          <span className="font-semibold text-foreground">
            {item.value !== null ? item.value : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

interface PainTrendChartProps {
  initialEntries: PainEntry[];
}

export function PainTrendChart({ initialEntries }: PainTrendChartProps) {
  const [range, setRange] = useState<Range>("30d");
  const [entries, setEntries] = useState<PainEntry[]>(initialEntries);
  const [isPending, startTransition] = useTransition();
  const [hiddenRegions, setHiddenRegions] = useState<Set<string>>(new Set());

  function handleRangeChange(newRange: Range) {
    if (newRange === range) return;
    setRange(newRange);
    startTransition(async () => {
      const data = await getPainTrends(newRange);
      setEntries(data);
    });
  }

  function toggleRegion(key: string) {
    setHiddenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const chartData = useMemo(() => entriesToChartData(entries), [entries]);

  const isEmpty = chartData.length === 0;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Range selector */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Daily Average Pain</p>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleRangeChange(r)}
              className={cn(
                "active-scale px-3 py-1.5 text-xs font-medium transition-colors",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {r === "all" ? "All" : r === "7d" ? "7d" : "30d"}
            </button>
          ))}
        </div>
      </div>

      {/* Region toggles */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border">
        {REGIONS.map((region) => {
          const hidden = hiddenRegions.has(region.key);
          return (
            <button
              key={region.key}
              type="button"
              onClick={() => toggleRegion(region.key)}
              className={cn(
                "active-scale flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                hidden
                  ? "border-border bg-background text-muted-foreground"
                  : "border-transparent text-white"
              )}
              style={
                hidden ? {} : { backgroundColor: region.hex }
              }
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: hidden ? "#94a3b8" : "white" }}
              />
              {region.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="p-4">
        {isPending && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Loading...
          </div>
        )}

        {!isPending && isEmpty && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground text-sm font-medium">No data for this period</p>
            <p className="text-muted-foreground text-xs mt-1">
              Start logging pain to see your trends here
            </p>
          </div>
        )}

        {!isPending && !isEmpty && (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(214.3 31.8% 91.4%)"
                vertical={false}
              />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
                tick={{ fontSize: 11, fill: "hsl(215.4 16.3% 46.9%)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ display: "none" }}
              />
              {REGIONS.map((region) =>
                hiddenRegions.has(region.key) ? null : (
                  <Line
                    key={region.key}
                    type="monotone"
                    dataKey={region.key}
                    name={region.label}
                    stroke={region.hex}
                    strokeWidth={2}
                    dot={chartData.length <= 14 ? { r: 3, fill: region.hex, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                )
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {!isEmpty && !isPending && (
        <div className="grid grid-cols-4 border-t border-border">
          {REGIONS.map((region) => {
            const vals = chartData
              .map((d) => d[region.key])
              .filter((v): v is number => v !== null);
            const avg =
              vals.length > 0
                ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
                : null;

            return (
              <div key={region.key} className="flex flex-col items-center py-3 px-2">
                <div
                  className="w-2.5 h-2.5 rounded-full mb-1.5"
                  style={{ backgroundColor: region.hex }}
                />
                <p className="text-[10px] text-muted-foreground font-medium">
                  {region.label}
                </p>
                <p
                  className="text-base font-bold mt-0.5"
                  style={{ color: region.hex }}
                >
                  {avg !== null ? avg : "—"}
                </p>
                <p className="text-[9px] text-muted-foreground">avg</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
