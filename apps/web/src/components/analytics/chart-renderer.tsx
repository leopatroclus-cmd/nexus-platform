'use client';

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, FunnelChart, Funnel, LabelList,
} from 'recharts';
import type { ChartType } from './chart-type-inference';
import { extractChartData, pickKeys } from './chart-type-inference';

const COLORS = [
  'hsl(24, 95%, 53%)',   // orange-500 primary
  'hsl(24, 90%, 62%)',   // orange-400
  'hsl(24, 85%, 45%)',   // orange-600
  'hsl(30, 80%, 55%)',   // amber variant
  'hsl(20, 90%, 48%)',   // deep orange
  'hsl(35, 85%, 60%)',   // golden
  'hsl(15, 75%, 50%)',   // rust
  'hsl(28, 70%, 65%)',   // peach
];

interface ChartRendererProps {
  chartType: ChartType;
  toolName: string;
  data: unknown;
  compact?: boolean;
}

export function ChartRenderer({ chartType, toolName, data, compact }: ChartRendererProps) {
  const rows = extractChartData(data);
  const { labelKey, valueKey } = pickKeys(rows);
  const height = compact ? 200 : 320;

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No data to display
      </div>
    );
  }

  switch (chartType) {
    case 'line':
      return <TimeSeriesChart rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} compact={compact} />;
    case 'bar':
      return <VerticalBarChart rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} compact={compact} />;
    case 'horizontal_bar':
      return <HorizontalBarChart rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} compact={compact} />;
    case 'pie':
      return <PieChartComponent rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} />;
    case 'stat':
      return <StatCard data={data} compact={compact} />;
    case 'funnel':
      return <FunnelChartComponent rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} />;
    default:
      return <VerticalBarChart rows={rows} labelKey={labelKey} valueKey={valueKey} height={height} compact={compact} />;
  }
}

interface SubChartProps {
  rows: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  height: number;
  compact?: boolean;
}

function TimeSeriesChart({ rows, labelKey, valueKey, height }: SubChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey={valueKey}
          stroke={COLORS[0]}
          strokeWidth={2.5}
          dot={{ fill: COLORS[0], r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function VerticalBarChart({ rows, labelKey, valueKey, height }: SubChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function HorizontalBarChart({ rows, labelKey, valueKey, height }: SubChartProps) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(height, rows.length * 40)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
        <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={75} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartComponent({ rows, labelKey, valueKey, height }: Omit<SubChartProps, 'compact'>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey={valueKey}
          nameKey={labelKey}
          cx="50%"
          cy="50%"
          outerRadius={height / 3}
          innerRadius={height / 5}
          paddingAngle={2}
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function StatCard({ data, compact }: { data: unknown; compact?: boolean }) {
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const entries = Object.entries(obj).filter(([, v]) => typeof v === 'number' || typeof v === 'string');

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {key.replace(/_/g, ' ')}
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function FunnelChartComponent({ rows, labelKey, valueKey, height }: SubChartProps) {
  const funnelData = rows.map((row, i) => ({
    name: String(row[labelKey] || ''),
    value: Number(row[valueKey] || 0),
    fill: COLORS[i % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <FunnelChart>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Funnel dataKey="value" data={funnelData} isAnimationActive>
          <LabelList position="right" fill="hsl(var(--foreground))" fontSize={12} dataKey="name" />
          <LabelList position="center" fill="#fff" fontSize={12} dataKey="value" />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}
