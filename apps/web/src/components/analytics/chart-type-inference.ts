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
      // Check for summary/stat vs list data
      if (!Array.isArray(data) && typeof data === 'object' && data !== null) {
        const keys = Object.keys(data);
        if (keys.some(k => /outstanding|total|count/i.test(k)) && arr.length === 0) return 'stat';
        if (keys.some(k => /status_summary|by_status/i.test(k))) return 'pie';
      }
      if (arr.length > 0) {
        const keys = Object.keys(arr[0]);
        if (keys.some(k => /status/i.test(k))) return 'pie';
        if (keys.some(k => /overdue|days/i.test(k))) return 'horizontal_bar';
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
        const keys = Object.keys(data);
        if (keys.some(k => /valuation|total_value/i.test(k))) return 'stat';
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
 * Analytics tools may return { data: [...] } or just [...]
 */
export function extractChartData(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    // Common wrapper shapes
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.rows)) return obj.rows;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.results)) return obj.results;
    // Single stat object — wrap it
    return [obj];
  }
  return [];
}

/**
 * Pick the best label and value keys from the first data row.
 */
export function pickKeys(rows: Record<string, unknown>[]): { labelKey: string; valueKey: string } {
  if (rows.length === 0) return { labelKey: 'name', valueKey: 'value' };
  const keys = Object.keys(rows[0]);

  const labelCandidates = ['name', 'label', 'stage', 'status', 'method', 'month', 'period', 'quarter', 'date', 'client', 'customer', 'product', 'category'];
  const valueCandidates = ['value', 'amount', 'total', 'revenue', 'count', 'quantity', 'sum'];

  const labelKey = labelCandidates.find(c => keys.includes(c)) || keys[0];
  const valueKey = valueCandidates.find(c => keys.includes(c) && c !== labelKey) || keys.find(k => k !== labelKey && typeof rows[0][k] === 'number') || keys[1] || 'value';

  return { labelKey, valueKey };
}
