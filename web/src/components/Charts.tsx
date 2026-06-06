"use client";

import {
  Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { COLORS, truncate } from "~/lib/ui";

type Datum = { label: string; value: number; color?: string; raw?: unknown };

export function HBar({ data, height = 280, suffix = "", color = COLORS.azul }: {
  data: Datum[]; height?: number; suffix?: string; color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}${suffix}`} />
        <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }}
               tickFormatter={(v: string) => truncate(v, 18)} />
        <Tooltip formatter={(v: number) => `${v}${suffix}`} labelFormatter={(l) => l} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
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
        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={50} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}${suffix}`} />
        <Tooltip formatter={(v: number) => `${v}${suffix}`} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? palette[i % palette.length]} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString("es-MX")} />
      </PieChart>
    </ResponsiveContainer>
  );
}
