import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ChartDefinition } from '@/components/analytics/chart-catalog';
import { resolveParams } from '@/components/analytics/chart-catalog';

export function useChartData(chart: ChartDefinition) {
  const params = resolveParams(chart);

  return useQuery({
    queryKey: ['chart', chart.id, params],
    queryFn: async () => {
      const { data } = await api.get(chart.endpoint, { params });
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
