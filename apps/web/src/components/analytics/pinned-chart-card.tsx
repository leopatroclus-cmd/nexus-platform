'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PinOff, Loader2 } from 'lucide-react';
import { ChartRenderer } from './chart-renderer';
import type { ChartType } from './chart-type-inference';

export interface PinnedChart {
  id: string;
  query: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  resultData: unknown;
  chartType: ChartType;
  title: string;
  displayOrder: number;
}

interface PinnedChartCardProps {
  pin: PinnedChart;
  compact?: boolean;
  onUnpin?: (pinId: string) => void;
  isUnpinning?: boolean;
}

export function PinnedChartCard({ pin, compact, onUnpin, isUnpinning }: PinnedChartCardProps) {
  return (
    <Card className="border-border/60 overflow-hidden">
      <CardHeader className={`flex flex-row items-start justify-between gap-3 ${compact ? 'pb-2 pt-4 px-4' : 'pb-3'}`}>
        <div className="min-w-0 flex-1">
          <CardTitle className={compact ? 'text-sm' : 'text-base'}>{pin.title}</CardTitle>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pin.query}</p>
          )}
        </div>
        {onUnpin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onUnpin(pin.id)}
            disabled={isUnpinning}
            className="shrink-0 h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
            title="Unpin"
          >
            {isUnpinning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PinOff className="h-3.5 w-3.5" />}
          </Button>
        )}
      </CardHeader>
      <CardContent className={compact ? 'px-4 pb-4' : ''}>
        <ChartRenderer
          chartType={pin.chartType}
          toolName={pin.toolName}
          data={pin.resultData}
          compact={compact}
        />
      </CardContent>
    </Card>
  );
}
