"use client";

import { useMemo, useRef, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, ImageDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CorrelationOverlayPoint } from "@/lib/actions/insights";

const METRICS = [
  { key: "sleep_score", label: "Sleep score", hex: "#3b82f6", max: 100 },
  { key: "resting_hr", label: "Resting HR", hex: "#ef4444", max: 100 },
  { key: "azm_total", label: "Load (AZM)", hex: "#f59e0b", max: 120 },
  { key: "stress_score", label: "Stress", hex: "#8b5cf6", max: 100 },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function CorrelationChart({
  overlay,
}: {
  overlay: CorrelationOverlayPoint[];
}) {
  const [metric, setMetric] = useState<MetricKey>("sleep_score");
  const chartRef = useRef<HTMLDivElement>(null);
  const active = METRICS.find((m) => m.key === metric)!;

  const data = useMemo(
    () =>
      overlay.map((p) => ({
        displayDate: `${parseInt(p.date.slice(5, 7))}/${parseInt(p.date.slice(8, 10))}`,
        date: p.date,
        pain: p.pain,
        metric: p[metric],
      })),
    [overlay, metric]
  );

  function exportCsv() {
    const header = "date,pain,sleep_score,resting_hr,azm_total,stress_score";
    const rows = overlay.map((p) =>
      [
        p.date,
        p.pain ?? "",
        p.sleep_score ?? "",
        p.resting_hr ?? "",
        p.azm_total ?? "",
        p.stress_score ?? "",
      ].join(",")
    );
    downloadBlob(
      new Blob([[header, ...rows].join("\n")], { type: "text/csv" }),
      "recoverflow-metrics.csv"
    );
  }

  function exportPng() {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const width = svg.clientWidth || 600;
    const height = svg.clientHeight || 300;
    const svgString = new XMLSerializer().serializeToString(clone);
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, "recoverflow-correlation.png");
        });
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  if (overlay.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        No overlapping pain and Fitbit data yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-border">
        <p className="text-sm font-semibold">Pain vs {active.label}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={exportPng}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-xs font-medium hover:bg-muted"
          >
            <ImageDown className="h-3 w-3" /> PNG
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-input px-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="h-3 w-3" /> CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-border">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "active-scale flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
              metric === m.key
                ? "border-transparent text-white"
                : "border-border bg-background text-muted-foreground"
            )}
            style={metric === m.key ? { backgroundColor: m.hex } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="p-4" ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={data}
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
              yAxisId="pain"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="metric"
              orientation="right"
              domain={[0, active.max]}
              tick={{ fontSize: 11, fill: active.hex }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip />
            <Line
              yAxisId="pain"
              type="monotone"
              dataKey="pain"
              name="Pain"
              stroke="#64748b"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="metric"
              type="monotone"
              dataKey="metric"
              name={active.label}
              stroke={active.hex}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
