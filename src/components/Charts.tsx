"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { COLORS, truncate } from "~/lib/ui";

type Datum = { label: string; value: number; color?: string; raw?: unknown };

// Tooltip that reads CSS variables — works in both light and dark mode.
function ChartTooltip({
  active, payload, label, suffix = "",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="chart-tooltip-label">{label}</p>}
      <p className="chart-tooltip-value">
        {Number(payload[0]!.value).toLocaleString("es-MX")}
        {suffix}
      </p>
    </div>
  );
}

// Axis tick color reads the CSS ink variable.
const TICK_STYLE = { fill: "var(--color-muted)", fontSize: 10 } as const;
const GRID_COLOR = "var(--color-border)";

export function HBar({ data, height = 280, suffix = "", color = COLORS.azul }: {
  data: Datum[]; height?: number; suffix?: string; color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} horizontal={false} />
        <XAxis
          type="number" tick={TICK_STYLE}
          tickFormatter={(v) => `${v}${suffix}`}
          axisLine={false} tickLine={false}
        />
        <YAxis
          type="category" dataKey="label" width={170} tick={TICK_STYLE}
          tickFormatter={(v: string) => truncate(v, 30)}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<ChartTooltip suffix={suffix} />} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBar({ data, height = 260, suffix = "", color = COLORS.rojo }: {
  data: Datum[]; height?: number; suffix?: string; color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="label" tick={TICK_STYLE} interval={0}
          angle={-35} textAnchor="end" height={50}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={TICK_STYLE} tickFormatter={(v) => `${v}${suffix}`}
          axisLine={false} tickLine={false}
        />
        <Tooltip content={<ChartTooltip suffix={suffix} />} />
        <Bar dataKey="value" radius={[5, 5, 0, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data, height = 240 }: { data: Datum[]; height?: number }) {
  const palette = [COLORS.verde, COLORS.azul, COLORS.amarillo, COLORS.rojo, COLORS.gris];
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data} dataKey="value" nameKey="label"
          innerRadius={58} outerRadius={90} paddingAngle={3}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? palette[i % palette.length]} stroke="none" />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-muted)" }} />
        <Tooltip formatter={(v: number) => v.toLocaleString("es-MX")} />
      </PieChart>
    </ResponsiveContainer>
  );
}
