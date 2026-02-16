export type ChartType = 'line' | 'bar' | 'horizontal_bar' | 'pie' | 'stat' | 'funnel';

export function inferChartType(toolName: string, data: unknown): ChartType {
  const arr = Array.isArray(data) ? data : [];

  switch (toolName) {
    case 'revenue_analytics': {
      // If rows have month/quarter keys → line, if by client → bar
      if (arr.length > 0) {
        const keys = Object.keys(arr[0]);
        if (keys.some(k => /month|quarter|period|date/i.test(k))) return 'line';
        if (keys.some(k => /client|customer|company/i.test(k))) return 'bar';
      }
      return 'line';
    }

    case 'top_products':
      return 'horizontal_bar';

    case 'invoice_analytics': {
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (obj.mode === 'outstanding') return 'stat';
        if (obj.mode === 'status_summary') return 'pie';
        if (obj.mode === 'overdue') return 'horizontal_bar';
      }
      return 'stat';
    }

    case 'payment_analytics': {
      if (arr.length > 0) {
        const keys = Object.keys(arr[0]);
        if (keys.some(k => /month|period|date/i.test(k))) return 'line';
        if (keys.some(k => /method|type/i.test(k))) return 'pie';
        if (keys.some(k => /client|customer/i.test(k))) return 'bar';
      }
      return 'line';
    }

    case 'inventory_analytics': {
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        if (obj.mode === 'valuation') return 'stat';
      }
      return 'horizontal_bar';
    }

    case 'deal_pipeline_analytics':
      return 'funnel';

    default:
      return 'bar';
  }
}

/**
 * Extract chart-friendly rows from tool result data.
 * Analytics tools may return { data: [...] }, { stages: [...] }, or just [...]
 */
export function extractChartData(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    // Known wrapper keys
    for (const key of ['data', 'rows', 'items', 'results', 'invoices', 'statuses', 'stages']) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
    // Fallback: find any array property
    for (const val of Object.values(obj)) {
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return val as Record<string, unknown>[];
      }
    }
    // Single stat object — wrap it
    return [obj];
  }
  return [];
}

/**
 * Pick the best label and value keys from the first data row.
 * Uses substring matching so compound keys like totalRevenue match 'revenue'.
 */
export function pickKeys(rows: Record<string, unknown>[]): { labelKey: string; valueKey: string } {
  if (rows.length === 0) return { labelKey: 'name', valueKey: 'value' };
  const keys = Object.keys(rows[0]);
  const lower = (s: string) => s.toLowerCase();

  const labelPatterns = ['name', 'label', 'stage', 'status', 'method', 'month', 'period', 'quarter', 'date', 'client', 'customer', 'product', 'category', 'sku'];
  const valuePatterns = ['revenue', 'amount', 'total', 'value', 'count', 'quantity', 'sum'];

  // Find the best label key: prefer exact match, then substring
  const labelKey =
    keys.find(k => labelPatterns.includes(lower(k))) ||
    keys.find(k => labelPatterns.some(p => lower(k).includes(p) && typeof rows[0][k] === 'string')) ||
    keys.find(k => typeof rows[0][k] === 'string') ||
    keys[0];

  // Find the best value key: prefer substring match on a numeric field
  const valueKey =
    keys.find(k => k !== labelKey && valuePatterns.some(p => lower(k).includes(p)) && typeof rows[0][k] === 'number') ||
    keys.find(k => k !== labelKey && typeof rows[0][k] === 'number') ||
    keys[1] || 'value';

  return { labelKey, valueKey };
}
