'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, Loader2 } from 'lucide-react';
import { ChartRenderer } from './chart-renderer';
import type { ChartType } from './chart-type-inference';

export interface AnalyticsResult {
  id: string;
  query: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  chartType: ChartType;
  data: unknown;
  summary?: string;
}

interface AnalyticsChartCardProps {
  result: AnalyticsResult;
  compact?: boolean;
  onPin?: (result: AnalyticsResult) => void;
  isPinning?: boolean;
}

export function AnalyticsChartCard({ result, compact, onPin, isPinning }: AnalyticsChartCardProps) {
  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className={`flex flex-row items-start justify-between gap-3 ${compact ? 'pb-2 pt-4 px-4' : 'pb-3'}`}>
        <div className="min-w-0 flex-1">
          <CardTitle className={compact ? 'text-sm' : 'text-base'}>{result.query}</CardTitle>
          {result.summary && !compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.summary}</p>
          )}
        </div>
        {onPin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPin(result)}
            disabled={isPinning}
            className="shrink-0 h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
            title="Pin to dashboard"
          >
            {isPinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
        )}
      </CardHeader>
      <CardContent className={compact ? 'px-4 pb-4' : ''}>
        <ChartRenderer
          chartType={result.chartType}
          toolName={result.toolName}
          data={result.data}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}
