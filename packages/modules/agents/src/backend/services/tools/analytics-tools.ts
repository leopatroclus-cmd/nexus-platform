import type { Tool } from './types.js';
import {
  getRevenueAnalytics,
  getTopProducts,
  getInvoiceAnalytics,
  getPaymentAnalytics,
  getInventoryAnalytics,
} from '@nexus/module-erp/services/erp-analytics.service.js';
import { getDealPipelineAnalytics } from '@nexus/module-crm/services/crm-analytics.service.js';

export const analyticsTools: Tool[] = [
  {
    key: 'erp_revenue_analytics',
    name: 'revenue_analytics',
    description: 'Analyze sales order revenue with grouping by client, month, or quarter. Supports date range filtering, client filtering, and sorting. Excludes draft and cancelled orders.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: { type: 'string', description: 'Group results by: client, month, or quarter (default: month)' },
        startDate: { type: 'string', description: 'Start date in ISO format (e.g. 2024-01-01)' },
        endDate: { type: 'string', description: 'End date in ISO format (e.g. 2024-12-31)' },
        clientId: { type: 'string', description: 'Filter by a specific client ID' },
        limit: { type: 'number', description: 'Max results to return (default 50, max 200)' },
        sortDirection: { type: 'string', description: 'Sort direction: asc or desc (default: desc)' },
      },
    },
    requiredPermission: 'erp:orders:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getRevenueAnalytics(db, orgId, {
        groupBy: args.groupBy as 'client' | 'month' | 'quarter',
        startDate: args.startDate as string,
        endDate: args.endDate as string,
        clientId: args.clientId as string,
        limit: args.limit as number,
        sortDirection: args.sortDirection as 'asc' | 'desc',
      });
    },
  },
  {
    key: 'erp_top_products',
    name: 'top_products',
    description: 'Get top-selling products ranked by quantity sold or revenue within a date range. Returns product name, SKU, total quantity, total revenue, and order count.',
    parameters: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in ISO format (required)' },
        endDate: { type: 'string', description: 'End date in ISO format (required)' },
        metric: { type: 'string', description: 'Rank by: quantity or revenue (default: quantity)' },
        limit: { type: 'number', description: 'Number of top products to return (default 10, max 100)' },
      },
      required: ['startDate', 'endDate'],
    },
    requiredPermission: 'erp:orders:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getTopProducts(db, orgId, {
        startDate: args.startDate as string,
        endDate: args.endDate as string,
        metric: args.metric as 'quantity' | 'revenue',
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_invoice_analytics',
    name: 'invoice_analytics',
    description: 'Analyze invoices in three modes: "outstanding" returns total unpaid balance, "overdue" lists invoices past due date with days overdue, "status_summary" groups invoices by status with counts and totals.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'Analysis mode: outstanding, overdue, or status_summary (required)' },
      },
      required: ['mode'],
    },
    requiredPermission: 'erp:invoices:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getInvoiceAnalytics(db, orgId, {
        mode: args.mode as 'outstanding' | 'overdue' | 'status_summary',
      });
    },
  },
  {
    key: 'erp_payment_analytics',
    name: 'payment_analytics',
    description: 'Analyze completed payments grouped by payment method, month, or client. Supports date range and client filtering.',
    parameters: {
      type: 'object',
      properties: {
        groupBy: { type: 'string', description: 'Group results by: method, month, or client (default: method)' },
        startDate: { type: 'string', description: 'Start date in ISO format' },
        endDate: { type: 'string', description: 'End date in ISO format' },
        clientId: { type: 'string', description: 'Filter by a specific client ID' },
        limit: { type: 'number', description: 'Max results to return (default 50, max 200)' },
      },
    },
    requiredPermission: 'erp:invoices:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getPaymentAnalytics(db, orgId, {
        groupBy: args.groupBy as 'method' | 'month' | 'client',
        startDate: args.startDate as string,
        endDate: args.endDate as string,
        clientId: args.clientId as string,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_inventory_analytics',
    name: 'inventory_analytics',
    description: 'Analyze inventory in three modes: "low_stock" lists items at or below reorder level, "valuation" shows total stock value at cost and retail, "top_by_value" ranks items by cost value on hand.',
    parameters: {
      type: 'object',
      properties: {
        mode: { type: 'string', description: 'Analysis mode: low_stock, valuation, or top_by_value (required)' },
        limit: { type: 'number', description: 'Max items to return for top_by_value mode (default 10, max 100)' },
      },
      required: ['mode'],
    },
    requiredPermission: 'erp:inventory:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getInventoryAnalytics(db, orgId, {
        mode: args.mode as 'low_stock' | 'valuation' | 'top_by_value',
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'crm_deal_analytics',
    name: 'deal_pipeline_analytics',
    description: 'Get deal pipeline analytics showing deals grouped by stage with counts, total value, and weighted value (value * probability). Supports filtering by pipeline, owner, and expected close date range.',
    parameters: {
      type: 'object',
      properties: {
        pipelineName: { type: 'string', description: 'Filter by pipeline name' },
        ownerId: { type: 'string', description: 'Filter by deal owner ID' },
        expectedCloseStart: { type: 'string', description: 'Expected close start date in ISO format' },
        expectedCloseEnd: { type: 'string', description: 'Expected close end date in ISO format' },
        includeWon: { type: 'boolean', description: 'Include won stages (default: true)' },
        includeLost: { type: 'boolean', description: 'Include lost stages (default: true)' },
      },
    },
    requiredPermission: 'crm:contacts:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getDealPipelineAnalytics(db, orgId, {
        pipelineName: args.pipelineName as string,
        ownerId: args.ownerId as string,
        expectedCloseStart: args.expectedCloseStart as string,
        expectedCloseEnd: args.expectedCloseEnd as string,
        includeWon: args.includeWon as boolean,
        includeLost: args.includeLost as boolean,
      });
    },
  },
];
