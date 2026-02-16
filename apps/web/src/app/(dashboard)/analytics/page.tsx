'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAnalyticsQuery } from '@/hooks/use-analytics-query';
import { AnalyticsPromptBar } from '@/components/analytics/analytics-prompt-bar';
import { AnalyticsChartCard } from '@/components/analytics/analytics-chart-card';
import type { AnalyticsResult } from '@/components/analytics/analytics-chart-card';
import { PinnedChartCard } from '@/components/analytics/pinned-chart-card';
import type { PinnedChart } from '@/components/analytics/pinned-chart-card';
import { BarChart3, Pin, AlertTriangle } from 'lucide-react';

export default function AnalyticsPage() {
  const queryClient = useQueryClient();
  const { sendQuery, isLoading, error, results } = useAnalyticsQuery();

  const { data: pinnedCharts } = useQuery({
    queryKey: ['pinned-charts'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/pins');
      return data.data as PinnedChart[];
    },
  });

  const pinMutation = useMutation({
    mutationFn: (result: AnalyticsResult) =>
      api.post('/analytics/pins', {
        query: result.query,
        toolName: result.toolName,
        toolArgs: result.toolArgs,
        resultData: result.data,
        chartType: result.chartType,
        title: result.query,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pinned-charts'] }),
  });

  const unpinMutation = useMutation({
    mutationFn: (pinId: string) => api.delete(`/analytics/pins/${pinId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pinned-charts'] }),
  });

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
          Ask questions about your data and get instant visual insights
        </p>
      </div>

      {/* Prompt bar */}
      <AnalyticsPromptBar onSubmit={sendQuery} isLoading={isLoading} />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Live results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-lg">Results</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {results.map((result) => (
              <AnalyticsChartCard
                key={result.id}
                result={result}
                onPin={(r) => pinMutation.mutate(r)}
                isPinning={pinMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

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

      {/* Empty state */}
      {results.length === 0 && (!pinnedCharts || pinnedCharts.length === 0) && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50 mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="font-serif text-lg">No analytics yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Try asking something like &ldquo;Show me revenue by month&rdquo; or &ldquo;What are our top products?&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
