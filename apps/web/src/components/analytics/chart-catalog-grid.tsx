'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, TrendingUp, Users, CalendarRange, Package, DollarSign,
  FileText, CircleDollarSign, AlertTriangle, CreditCard, Calendar,
  Warehouse, AlertCircle, BarChart3, Handshake,
} from 'lucide-react';
import type { ChartDefinition } from './chart-catalog';
import { CHART_CATALOG } from './chart-catalog';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, TrendingUp, Users, CalendarRange, Package, DollarSign,
  FileText, CircleDollarSign, AlertTriangle, CreditCard, Calendar,
  Warehouse, AlertCircle, BarChart3, Handshake,
};

type CategoryFilter = 'all' | 'erp' | 'crm';

interface ChartCatalogGridProps {
  activeChartIds: Set<string>;
  onSelect: (chart: ChartDefinition) => void;
}

export function ChartCatalogGrid({ activeChartIds, onSelect }: ChartCatalogGridProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filtered = filter === 'all'
    ? CHART_CATALOG
    : CHART_CATALOG.filter((c) => c.category === filter);

  const tabs: { value: CategoryFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'erp', label: 'ERP' },
    { value: 'crm', label: 'CRM' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1.5 rounded-lg bg-secondary/50 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((chart) => {
          const Icon = ICON_MAP[chart.icon] || BarChart3;
          const isActive = activeChartIds.has(chart.id);

          return (
            <Card
              key={chart.id}
              onClick={() => onSelect(chart)}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 ${
                isActive ? 'border-primary/40 bg-primary/5' : 'border-border/60'
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">{chart.title}</p>
                    <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 uppercase">
                      {chart.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{chart.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
