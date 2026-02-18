import type { Tool } from './types.js';
import { listClients, getClientById, createClient, getClientStatement } from '@nexus/module-erp/services/clients.service.js';
import { listInventory, getItemById, createItem } from '@nexus/module-erp/services/inventory.service.js';
import { listOrders, getOrderById, createOrder } from '@nexus/module-erp/services/orders.service.js';
import { listInvoices, getInvoiceById, createInvoice, updateStatus } from '@nexus/module-erp/services/invoices.service.js';
import { listPayments, createPayment } from '@nexus/module-erp/services/payments.service.js';
import { resolvePriceForClient } from '@nexus/module-erp/services/pricelists.service.js';
import { getQuickStats } from '@nexus/module-erp/services/dashboard.service.js';

export const erpTools: Tool[] = [
  {
    key: 'erp_list_clients',
    name: 'list_clients',
    description: 'List ERP clients (customers/vendors) with optional search and type filter.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by client name' },
        type: { type: 'string', description: 'Filter by type (customer or vendor)' },
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Results per page' },
      },
    },
    requiredPermission: 'erp:clients:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listClients(db, orgId, {
        search: args.search as string,
        type: args.type as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_get_client',
    name: 'get_client',
    description: 'Get a specific ERP client by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The client ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'erp:clients:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getClientById(db, orgId, args.id as string);
    },
  },
  {
    key: 'erp_list_inventory',
    name: 'list_inventory',
    description: 'List inventory items with optional search and type filter.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search by item name' },
        type: { type: 'string', description: 'Filter by item type' },
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Results per page' },
      },
    },
    requiredPermission: 'erp:inventory:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listInventory(db, orgId, {
        search: args.search as string,
        type: args.type as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_get_inventory_item',
    name: 'get_inventory_item',
    description: 'Get a specific inventory item by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The inventory item ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'erp:inventory:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getItemById(db, orgId, args.id as string);
    },
  },
  {
    key: 'erp_list_orders',
    name: 'list_orders',
    description: 'List orders with optional filters for type, status, and client.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Order type (sales or purchase)' },
        status: { type: 'string', description: 'Order status (draft, confirmed, etc.)' },
        clientId: { type: 'string', description: 'Filter by client ID' },
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Results per page' },
      },
    },
    requiredPermission: 'erp:orders:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listOrders(db, orgId, {
        type: args.type as string,
        status: args.status as string,
        clientId: args.clientId as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_get_order',
    name: 'get_order',
    description: 'Get a specific order by ID, including its line items.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The order ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'erp:orders:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getOrderById(db, orgId, args.id as string);
    },
  },
  {
    key: 'erp_create_order',
    name: 'create_order',
    description: 'Create a new order. This is a destructive action that requires approval. Provide type, clientId, orderDate, and items array.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Order type: sales or purchase' },
        clientId: { type: 'string', description: 'The client ID' },
        orderDate: { type: 'string', description: 'Order date in ISO format' },
        discount: { type: 'number', description: 'Order-level discount amount' },
        items: {
          type: 'array',
          description: 'Array of line items',
          items: {
            type: 'object',
            properties: {
              inventoryId: { type: 'string', description: 'Inventory item ID' },
              description: { type: 'string', description: 'Line item description' },
              quantity: { type: 'number', description: 'Quantity' },
              unitPrice: { type: 'number', description: 'Unit price' },
              discountPct: { type: 'number', description: 'Line discount percentage' },
              taxRate: { type: 'number', description: 'Tax rate percentage' },
            },
            required: ['description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['type', 'clientId', 'orderDate', 'items'],
    },
    requiredPermission: 'erp:orders:create',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return createOrder(db, orgId, args);
    },
  },
  {
    key: 'erp_list_invoices',
    name: 'list_invoices',
    description: 'List invoices with optional filters for status, client, and type.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Invoice status (draft, sent, paid, etc.)' },
        clientId: { type: 'string', description: 'Filter by client ID' },
        type: { type: 'string', description: 'Invoice type (invoice or credit_note)' },
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Results per page' },
      },
    },
    requiredPermission: 'erp:invoices:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listInvoices(db, orgId, {
        status: args.status as string,
        clientId: args.clientId as string,
        type: args.type as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_get_invoice',
    name: 'get_invoice',
    description: 'Get a specific invoice by ID, including its line items.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The invoice ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'erp:invoices:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getInvoiceById(db, orgId, args.id as string);
    },
  },
  {
    key: 'erp_get_price_for_client',
    name: 'get_price_for_client',
    description: 'Get the price of an inventory item for a specific client, based on the client\'s assigned pricelist.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID' },
        inventoryId: { type: 'string', description: 'The inventory item ID' },
      },
      required: ['clientId', 'inventoryId'],
    },
    requiredPermission: 'erp:pricelists:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      const price = await resolvePriceForClient(db, orgId, args.clientId as string, args.inventoryId as string);
      return { price };
    },
  },
  {
    key: 'erp_create_invoice',
    name: 'create_invoice',
    description: 'Create a new invoice. This is a destructive action that requires approval. Provide clientId, dates, and line items.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID' },
        issueDate: { type: 'string', description: 'Issue date in ISO format' },
        dueDate: { type: 'string', description: 'Due date in ISO format' },
        items: {
          type: 'array',
          description: 'Array of line items',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', description: 'Line item description' },
              quantity: { type: 'number', description: 'Quantity' },
              unitPrice: { type: 'number', description: 'Unit price' },
              inventoryId: { type: 'string', description: 'Optional inventory item ID' },
              taxRate: { type: 'number', description: 'Tax rate percentage' },
              discountPct: { type: 'number', description: 'Line discount percentage' },
            },
            required: ['description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['clientId', 'issueDate', 'dueDate', 'items'],
    },
    requiredPermission: 'erp:invoices:create',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return createInvoice(db, orgId, {
        ...args,
        issueDate: new Date(args.issueDate as string),
        dueDate: new Date(args.dueDate as string),
      });
    },
  },
  {
    key: 'erp_update_invoice_status',
    name: 'update_invoice_status',
    description: 'Update an invoice status. This is a destructive action that requires approval.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The invoice ID' },
        status: { type: 'string', description: 'New status: draft, sent, paid, or void' },
      },
      required: ['id', 'status'],
    },
    requiredPermission: 'erp:invoices:update',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return updateStatus(db, orgId, args.id as string, args.status as string);
    },
  },
  {
    key: 'erp_create_payment',
    name: 'create_payment',
    description: 'Record a payment. This is a destructive action that requires approval.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID' },
        invoiceId: { type: 'string', description: 'Optional invoice ID to apply payment to' },
        amount: { type: 'number', description: 'Payment amount' },
        paymentDate: { type: 'string', description: 'Payment date in ISO format' },
        paymentMethod: { type: 'string', description: 'Payment method (e.g. bank_transfer, credit_card, cash, check)' },
      },
      required: ['clientId', 'amount', 'paymentDate', 'paymentMethod'],
    },
    requiredPermission: 'erp:payments:create',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return createPayment(db, orgId, {
        ...args,
        paymentDate: new Date(args.paymentDate as string),
      });
    },
  },
  {
    key: 'erp_list_payments',
    name: 'list_payments',
    description: 'List payments with optional filters for client and invoice.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Filter by client ID' },
        invoiceId: { type: 'string', description: 'Filter by invoice ID' },
        page: { type: 'number', description: 'Page number' },
        limit: { type: 'number', description: 'Results per page' },
      },
    },
    requiredPermission: 'erp:payments:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listPayments(db, orgId, {
        clientId: args.clientId as string,
        invoiceId: args.invoiceId as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'erp_create_client',
    name: 'create_client',
    description: 'Create a new ERP client (customer or vendor). This is a destructive action that requires approval.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Client name' },
        type: { type: 'string', description: 'Client type: customer or vendor' },
        taxId: { type: 'string', description: 'Tax identification number' },
        billingAddress: {
          type: 'object',
          description: 'Billing address',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            country: { type: 'string' },
          },
        },
        currency: { type: 'string', description: 'Currency code (e.g. USD, EUR)' },
        paymentTerms: { type: 'string', description: 'Payment terms (e.g. net_30, net_60)' },
      },
      required: ['name', 'type'],
    },
    requiredPermission: 'erp:clients:create',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return createClient(db, orgId, args);
    },
  },
  {
    key: 'erp_create_inventory_item',
    name: 'create_inventory_item',
    description: 'Create a new inventory item. This is a destructive action that requires approval.',
    parameters: {
      type: 'object',
      properties: {
        sku: { type: 'string', description: 'Stock keeping unit code' },
        name: { type: 'string', description: 'Item name' },
        type: { type: 'string', description: 'Item type (e.g. product, service, material)' },
        unit: { type: 'string', description: 'Unit of measure (e.g. pc, kg, hr)' },
        unitPrice: { type: 'number', description: 'Selling unit price' },
        costPrice: { type: 'number', description: 'Cost price' },
        taxRate: { type: 'number', description: 'Default tax rate percentage' },
      },
      required: ['sku', 'name'],
    },
    requiredPermission: 'erp:inventory:create',
    isDestructive: true,
    handler: async (db, orgId, args) => {
      return createItem(db, orgId, args);
    },
  },
  {
    key: 'erp_get_client_statement',
    name: 'get_client_statement',
    description: 'Get a client\'s account statement showing all invoices and payments with running balance. For the total outstanding balance, use the "totalBalance" field (openingBalance + accountBalance). Do NOT calculate from invoices and payments manually.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID' },
        startDate: { type: 'string', description: 'Optional start date filter in ISO format' },
        endDate: { type: 'string', description: 'Optional end date filter in ISO format' },
      },
      required: ['clientId'],
    },
    requiredPermission: 'erp:clients:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getClientStatement(db, orgId, args.clientId as string, {
        startDate: args.startDate ? new Date(args.startDate as string) : undefined,
        endDate: args.endDate ? new Date(args.endDate as string) : undefined,
      });
    },
  },
  {
    key: 'erp_dashboard_summary',
    name: 'dashboard_summary',
    description: 'Get a quick business health snapshot: recent revenue, outstanding receivables, and top clients. Use when user asks "how am I doing" or "give me a summary".',
    parameters: {
      type: 'object',
      properties: {},
    },
    requiredPermission: 'erp:orders:read',
    isDestructive: false,
    handler: async (db, orgId) => {
      return getQuickStats(db, orgId);
    },
  },
];
