import type { ChartType } from './chart-type-inference';

export interface ChartDefinition {
  id: string;
  title: string;
  description: string;
  category: 'erp' | 'crm';
  endpoint: string;
  defaultParams: Record<string, string>;
  chartType: ChartType;
  icon: string;
}

export const CHART_CATALOG: ChartDefinition[] = [
  // ─── ERP: Dashboard & Revenue ───
  {
    id: 'dashboard-summary',
    title: 'Dashboard Summary',
    description: 'Key business metrics at a glance',
    category: 'erp',
    endpoint: '/erp/analytics/dashboard',
    defaultParams: {},
    chartType: 'stat',
    icon: 'LayoutDashboard',
  },
  {
    id: 'revenue-over-time',
    title: 'Revenue Over Time',
    description: 'Monthly revenue trend',
    category: 'erp',
    endpoint: '/erp/analytics/revenue',
    defaultParams: { groupBy: 'month' },
    chartType: 'line',
    icon: 'TrendingUp',
  },
  {
    id: 'revenue-by-client',
    title: 'Revenue by Client',
    description: 'Revenue breakdown per client',
    category: 'erp',
    endpoint: '/erp/analytics/revenue-breakdown',
    defaultParams: { groupBy: 'client' },
    chartType: 'bar',
    icon: 'Users',
  },
  {
    id: 'revenue-by-quarter',
    title: 'Revenue by Quarter',
    description: 'Quarterly revenue comparison',
    category: 'erp',
    endpoint: '/erp/analytics/revenue-breakdown',
    defaultParams: { groupBy: 'quarter' },
    chartType: 'line',
    icon: 'CalendarRange',
  },

  // ─── ERP: Products ───
  {
    id: 'top-products-qty',
    title: 'Top Products (Qty)',
    description: 'Best-selling products by quantity',
    category: 'erp',
    endpoint: '/erp/analytics/top-products',
    defaultParams: { metric: 'quantity' },
    chartType: 'horizontal_bar',
    icon: 'Package',
  },
  {
    id: 'top-products-revenue',
    title: 'Top Products (Revenue)',
    description: 'Highest revenue-generating products',
    category: 'erp',
    endpoint: '/erp/analytics/top-products',
    defaultParams: { metric: 'revenue' },
    chartType: 'horizontal_bar',
    icon: 'DollarSign',
  },

  // ─── ERP: Invoices ───
  {
    id: 'invoice-status',
    title: 'Invoice Status',
    description: 'Distribution of invoices by status',
    category: 'erp',
    endpoint: '/erp/analytics/invoices',
    defaultParams: { mode: 'status_summary' },
    chartType: 'pie',
    icon: 'FileText',
  },
  {
    id: 'outstanding-receivables',
    title: 'Outstanding Receivables',
    description: 'Total outstanding invoice amounts',
    category: 'erp',
    endpoint: '/erp/analytics/invoices',
    defaultParams: { mode: 'outstanding' },
    chartType: 'stat',
    icon: 'CircleDollarSign',
  },
  {
    id: 'overdue-invoices',
    title: 'Overdue Invoices',
    description: 'Invoices past their due date',
    category: 'erp',
    endpoint: '/erp/analytics/invoices',
    defaultParams: { mode: 'overdue' },
    chartType: 'horizontal_bar',
    icon: 'AlertTriangle',
  },

  // ─── ERP: Payments ───
  {
    id: 'payments-by-method',
    title: 'Payments by Method',
    description: 'Payment distribution by method',
    category: 'erp',
    endpoint: '/erp/analytics/payments',
    defaultParams: { groupBy: 'method' },
    chartType: 'pie',
    icon: 'CreditCard',
  },
  {
    id: 'payments-over-time',
    title: 'Payments Over Time',
    description: 'Monthly payment trends',
    category: 'erp',
    endpoint: '/erp/analytics/payments',
    defaultParams: { groupBy: 'month' },
    chartType: 'line',
    icon: 'Calendar',
  },

  // ─── ERP: Inventory ───
  {
    id: 'inventory-valuation',
    title: 'Inventory Valuation',
    description: 'Total inventory value summary',
    category: 'erp',
    endpoint: '/erp/analytics/inventory',
    defaultParams: { mode: 'valuation' },
    chartType: 'stat',
    icon: 'Warehouse',
  },
  {
    id: 'low-stock-alerts',
    title: 'Low Stock Alerts',
    description: 'Items below reorder threshold',
    category: 'erp',
    endpoint: '/erp/analytics/inventory',
    defaultParams: { mode: 'low_stock' },
    chartType: 'horizontal_bar',
    icon: 'AlertCircle',
  },
  {
    id: 'top-items-by-value',
    title: 'Top Items by Value',
    description: 'Highest-value inventory items',
    category: 'erp',
    endpoint: '/erp/analytics/inventory',
    defaultParams: { mode: 'top_by_value' },
    chartType: 'horizontal_bar',
    icon: 'BarChart3',
  },

  // ─── CRM ───
  {
    id: 'deal-pipeline',
    title: 'Deal Pipeline',
    description: 'Deal stages and conversion funnel',
    category: 'crm',
    endpoint: '/crm/analytics/deal-pipeline',
    defaultParams: {},
    chartType: 'funnel',
    icon: 'Handshake',
  },
];

/**
 * Resolve runtime params — merges chart defaults with date ranges where needed.
 * For top-products: defaults to last 12 months if no dates are in defaultParams.
 */
export function resolveParams(chart: ChartDefinition): Record<string, string> {
  const params = { ...chart.defaultParams };

  // Charts that benefit from a default date range
  const needsDateRange = [
    'top-products-qty',
    'top-products-revenue',
    'revenue-over-time',
    'revenue-by-quarter',
    'payments-over-time',
  ];

  if (needsDateRange.includes(chart.id) && !params.startDate) {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    params.startDate = start.toISOString().slice(0, 10);
    params.endDate = end.toISOString().slice(0, 10);
  }

  return params;
}
