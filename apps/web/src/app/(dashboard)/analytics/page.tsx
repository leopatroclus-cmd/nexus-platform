'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PinnedChartCard } from '@/components/analytics/pinned-chart-card';
import type { PinnedChart } from '@/components/analytics/pinned-chart-card';
import { CatalogChartCard } from '@/components/analytics/catalog-chart-card';
import { ChartCatalogGrid } from '@/components/analytics/chart-catalog-grid';
import type { ChartDefinition } from '@/components/analytics/chart-catalog';
import { CHART_CATALOG } from '@/components/analytics/chart-catalog';
import { BarChart3, Pin } from 'lucide-react';

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const [activeCharts, setActiveCharts] = useState<ChartDefinition[]>([]);

  // ─── Pinned charts ───
  const { data: pinnedCharts } = useQuery({
    queryKey: ['pinned-charts'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/pins');
      return data.data as PinnedChart[];
    },
  });

  const pinMutation = useMutation({
    mutationFn: (payload: { chart: ChartDefinition; data: unknown }) =>
      api.post('/analytics/pins', {
        query: payload.chart.title,
        toolName: payload.chart.id,
        toolArgs: payload.chart.defaultParams,
        resultData: payload.data,
        chartType: payload.chart.chartType,
        title: payload.chart.title,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pinned-charts'] }),
  });

  const unpinMutation = useMutation({
    mutationFn: (pinId: string) => api.delete(`/analytics/pins/${pinId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pinned-charts'] }),
  });

  // ─── Active charts management ───
  const activeChartIds = new Set(activeCharts.map((c) => c.id));

  const handleSelectChart = useCallback((chart: ChartDefinition) => {
    setActiveCharts((prev) => {
      if (prev.some((c) => c.id === chart.id)) {
        return prev.filter((c) => c.id !== chart.id);
      }
      return [...prev, chart];
    });
  }, []);

  const handleRemoveChart = useCallback((chartId: string) => {
    setActiveCharts((prev) => prev.filter((c) => c.id !== chartId));
  }, []);

  const handlePinChart = useCallback(
    (chart: ChartDefinition, data: unknown) => {
      pinMutation.mutate({ chart, data });
    },
    [pinMutation],
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-serif text-3xl">Analytics</h1>
        </div>
        <p className="text-muted-foreground mt-1 ml-[52px]">
          Browse charts and pin your favorites to the dashboard
        </p>
      </div>

      {/* Pinned charts */}
      {pinnedCharts && pinnedCharts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            <h2 className="font-serif text-lg">Pinned Charts</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {pinnedCharts.map((pin) => (
              <PinnedChartCard
                key={pin.id}
                pin={pin}
                onUnpin={(id) => unpinMutation.mutate(id)}
                isUnpinning={unpinMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active charts */}
      {activeCharts.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-lg">Active Charts</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {activeCharts.map((chart) => (
              <CatalogChartCard
                key={chart.id}
                chart={chart}
                onPin={handlePinChart}
                isPinning={pinMutation.isPending}
                onRemove={handleRemoveChart}
              />
            ))}
          </div>
        </div>
      )}

      {/* Chart Catalog */}
      <div className="space-y-4">
        <h2 className="font-serif text-lg">Chart Catalog</h2>
        <ChartCatalogGrid activeChartIds={activeChartIds} onSelect={handleSelectChart} />
      </div>

      {/* Empty state */}
      {activeCharts.length === 0 && (!pinnedCharts || pinnedCharts.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50 mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-serif text-lg">Select a chart to get started</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Click any chart above to visualize your data, then pin your favorites for quick access.
          </p>
        </div>
      )}
    </div>
  );
}
