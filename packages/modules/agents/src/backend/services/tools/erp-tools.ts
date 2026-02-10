import type { Tool } from './types.js';
import { listClients, getClientById } from '@nexus/module-erp/services/clients.service.js';
import { listInventory, getItemById } from '@nexus/module-erp/services/inventory.service.js';
import { listOrders, getOrderById, createOrder } from '@nexus/module-erp/services/orders.service.js';
import { listInvoices, getInvoiceById } from '@nexus/module-erp/services/invoices.service.js';
import { resolvePriceForClient } from '@nexus/module-erp/services/pricelists.service.js';

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
];
