'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, RefreshCw, X, Loader2 } from 'lucide-react';
import { useChartData } from '@/hooks/use-chart-data';
import type { ChartDefinition } from './chart-catalog';

const ChartRenderer = dynamic(
  () => import('./chart-renderer').then((m) => ({ default: m.ChartRenderer })),
  { ssr: false },
);

interface CatalogChartCardProps {
  chart: ChartDefinition;
  onPin?: (chart: ChartDefinition, data: unknown) => void;
  isPinning?: boolean;
  onRemove?: (chartId: string) => void;
}

export function CatalogChartCard({ chart, onPin, isPinning, onRemove }: CatalogChartCardProps) {
  const { data, isLoading, error, refetch } = useChartData(chart);

  // Map chart id to a toolName the ChartRenderer/pickKeys can work with
  const toolName = chartIdToToolName(chart.id);

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base">{chart.title}</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{chart.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            className="h-8 w-8 p-0 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {onPin && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => data && onPin(chart, data)}
              disabled={isPinning || !data}
              className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
              title="Pin to dashboard"
            >
              {isPinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pin className="h-3.5 w-3.5" />}
            </Button>
          )}
          {onRemove && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(chart.id)}
              className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-sm text-muted-foreground">
            <p>Failed to load data</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ChartRenderer chartType={chart.chartType} toolName={toolName} data={data} />
        )}
      </CardContent>
    </Card>
  );
}

function chartIdToToolName(id: string): string {
  const map: Record<string, string> = {
    'dashboard-summary': 'dashboard',
    'revenue-over-time': 'revenue_analytics',
    'revenue-by-client': 'revenue_analytics',
    'revenue-by-quarter': 'revenue_analytics',
    'top-products-qty': 'top_products',
    'top-products-revenue': 'top_products',
    'invoice-status': 'invoice_analytics',
    'outstanding-receivables': 'invoice_analytics',
    'overdue-invoices': 'invoice_analytics',
    'payments-by-method': 'payment_analytics',
    'payments-over-time': 'payment_analytics',
    'inventory-valuation': 'inventory_analytics',
    'low-stock-alerts': 'inventory_analytics',
    'top-items-by-value': 'inventory_analytics',
    'deal-pipeline': 'deal_pipeline_analytics',
  };
  return map[id] || 'unknown';
}
