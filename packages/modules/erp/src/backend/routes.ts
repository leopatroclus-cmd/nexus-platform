import { Router } from 'express';
import '@nexus/types';
import type { Database } from '@nexus/database';
import * as clientsSvc from './services/clients.service.js';
import * as inventorySvc from './services/inventory.service.js';
import * as ordersSvc from './services/orders.service.js';
import * as invoicesSvc from './services/invoices.service.js';
import * as paymentsSvc from './services/payments.service.js';
import * as ledgerSvc from './services/ledger.service.js';
import * as coaSvc from './services/chart-of-accounts.service.js';
import * as pricelistsSvc from './services/pricelists.service.js';
import * as restAnalyticsSvc from './services/erp-rest-analytics.service.js';
import * as erpAnalyticsSvc from './services/erp-analytics.service.js';

export function createErpRouter(db: Database): Router {
  const router = Router();

  // ─── Analytics ───
  router.get('/analytics/dashboard', async (req, res, next) => {
    try {
      const data = await restAnalyticsSvc.getDashboardSummary(db, req.orgId!);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  router.get('/analytics/revenue', async (req, res, next) => {
    try {
      const data = await restAnalyticsSvc.getRevenueTimeSeries(db, req.orgId!, {
        groupBy: (req.query.groupBy as 'day' | 'week' | 'month') || 'month',
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  router.get('/analytics/invoices', async (req, res, next) => {
    try {
      const mode = (req.query.mode as string) || 'status_summary';
      const data = await erpAnalyticsSvc.getInvoiceAnalytics(db, req.orgId!, {
        mode: mode as 'outstanding' | 'overdue' | 'status_summary',
      });
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  // ─── Clients ───
  router.get('/clients', async (req, res, next) => {
    try {
      const result = await clientsSvc.listClients(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        search: req.query.search as string, type: req.query.type as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/clients/:id', async (req, res, next) => {
    try {
      const client = await clientsSvc.getClientById(db, req.orgId!, req.params.id);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
      res.json({ success: true, data: client });
    } catch (e) { next(e); }
  });

  router.post('/clients', async (req, res, next) => {
    try {
      const client = await clientsSvc.createClient(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: client });
    } catch (e) { next(e); }
  });

  router.put('/clients/:id', async (req, res, next) => {
    try {
      const client = await clientsSvc.updateClient(db, req.orgId!, req.params.id, req.body);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
      res.json({ success: true, data: client });
    } catch (e) { next(e); }
  });

  router.delete('/clients/:id', async (req, res, next) => {
    try {
      await clientsSvc.deleteClient(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Client deleted' });
    } catch (e) { next(e); }
  });

  router.post('/clients/convert-from-crm', async (req, res, next) => {
    try {
      const client = await clientsSvc.convertFromCrm(db, req.orgId!, req.body.crmCompanyId);
      if (!client) return res.status(404).json({ success: false, error: 'CRM company not found' });
      res.status(201).json({ success: true, data: client });
    } catch (e) { next(e); }
  });

  // ─── Inventory ───
  router.get('/inventory', async (req, res, next) => {
    try {
      const result = await inventorySvc.listInventory(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        search: req.query.search as string, type: req.query.type as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/inventory/:id', async (req, res, next) => {
    try {
      const item = await inventorySvc.getItemById(db, req.orgId!, req.params.id);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  router.post('/inventory', async (req, res, next) => {
    try {
      const item = await inventorySvc.createItem(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  router.put('/inventory/:id', async (req, res, next) => {
    try {
      const item = await inventorySvc.updateItem(db, req.orgId!, req.params.id, req.body);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  router.delete('/inventory/:id', async (req, res, next) => {
    try {
      await inventorySvc.deleteItem(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Item deleted' });
    } catch (e) { next(e); }
  });

  router.post('/inventory/:id/adjust', async (req, res, next) => {
    try {
      const item = await inventorySvc.adjustStock(db, req.orgId!, req.params.id, req.body.quantity);
      if (!item) return res.status(404).json({ success: false, error: 'Item not found' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // ─── Orders ───
  router.get('/orders', async (req, res, next) => {
    try {
      const result = await ordersSvc.listOrders(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        type: req.query.type as string, status: req.query.status as string, clientId: req.query.clientId as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/orders/:id', async (req, res, next) => {
    try {
      const order = await ordersSvc.getOrderById(db, req.orgId!, req.params.id);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: order });
    } catch (e) { next(e); }
  });

  router.post('/orders', async (req, res, next) => {
    try {
      const order = await ordersSvc.createOrder(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: order });
    } catch (e) { next(e); }
  });

  router.put('/orders/:id', async (req, res, next) => {
    try {
      const order = await ordersSvc.updateOrder(db, req.orgId!, req.params.id, req.body);
      if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
      res.json({ success: true, data: order });
    } catch (e) { next(e); }
  });

  router.delete('/orders/:id', async (req, res, next) => {
    try {
      await ordersSvc.deleteOrder(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Order deleted' });
    } catch (e) { next(e); }
  });

  router.post('/orders/:id/convert-to-invoice', async (req, res, next) => {
    try {
      const invoice = await ordersSvc.convertToInvoice(db, req.orgId!, req.params.id);
      if (!invoice) return res.status(404).json({ success: false, error: 'Order not found' });
      res.status(201).json({ success: true, data: invoice });
    } catch (e) { next(e); }
  });

  // ─── Invoices ───
  router.get('/invoices', async (req, res, next) => {
    try {
      const result = await invoicesSvc.listInvoices(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        status: req.query.status as string, clientId: req.query.clientId as string, type: req.query.type as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/invoices/:id', async (req, res, next) => {
    try {
      const invoice = await invoicesSvc.getInvoiceById(db, req.orgId!, req.params.id);
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (e) { next(e); }
  });

  router.post('/invoices', async (req, res, next) => {
    try {
      const invoice = await invoicesSvc.createInvoice(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: invoice });
    } catch (e) { next(e); }
  });

  router.put('/invoices/:id/status', async (req, res, next) => {
    try {
      const invoice = await invoicesSvc.updateStatus(db, req.orgId!, req.params.id, req.body.status);
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.json({ success: true, data: invoice });
    } catch (e) { next(e); }
  });

  router.post('/invoices/:id/credit-note', async (req, res, next) => {
    try {
      const cn = await invoicesSvc.createCreditNote(db, req.orgId!, req.params.id, req.body.items);
      if (!cn) return res.status(404).json({ success: false, error: 'Invoice not found' });
      res.status(201).json({ success: true, data: cn });
    } catch (e) { next(e); }
  });

  router.delete('/invoices/:id', async (req, res, next) => {
    try {
      await invoicesSvc.deleteInvoice(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Invoice deleted' });
    } catch (e) { next(e); }
  });

  // ─── Payments ───
  router.get('/payments', async (req, res, next) => {
    try {
      const result = await paymentsSvc.listPayments(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        clientId: req.query.clientId as string, invoiceId: req.query.invoiceId as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/payments/:id', async (req, res, next) => {
    try {
      const payment = await paymentsSvc.getPaymentById(db, req.orgId!, req.params.id);
      if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
      res.json({ success: true, data: payment });
    } catch (e) { next(e); }
  });

  router.post('/payments', async (req, res, next) => {
    try {
      const payment = await paymentsSvc.createPayment(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: payment });
    } catch (e) { next(e); }
  });

  router.delete('/payments/:id', async (req, res, next) => {
    try {
      await paymentsSvc.deletePayment(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Payment deleted' });
    } catch (e) { next(e); }
  });

  // ─── Ledger ───
  router.get('/ledger', async (req, res, next) => {
    try {
      const result = await ledgerSvc.listEntries(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 50,
        accountCode: req.query.accountCode as string,
        startDate: req.query.startDate as string, endDate: req.query.endDate as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/ledger/balances', async (req, res, next) => {
    try {
      const balances = await ledgerSvc.getBalances(db, req.orgId!);
      res.json({ success: true, data: balances });
    } catch (e) { next(e); }
  });

  router.post('/ledger/entries', async (req, res, next) => {
    try {
      const entries = await ledgerSvc.createEntries(db, req.orgId!, req.body.entries);
      res.status(201).json({ success: true, data: entries });
    } catch (e) { next(e); }
  });

  // ─── Chart of Accounts ───
  router.get('/chart-of-accounts', async (req, res, next) => {
    try {
      const accounts = await coaSvc.listAccounts(db, req.orgId!);
      res.json({ success: true, data: accounts });
    } catch (e) { next(e); }
  });

  router.post('/chart-of-accounts', async (req, res, next) => {
    try {
      const account = await coaSvc.createAccount(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: account });
    } catch (e) { next(e); }
  });

  router.put('/chart-of-accounts/:id', async (req, res, next) => {
    try {
      const account = await coaSvc.updateAccount(db, req.orgId!, req.params.id, req.body);
      if (!account) return res.status(404).json({ success: false, error: 'Account not found' });
      res.json({ success: true, data: account });
    } catch (e) { next(e); }
  });

  router.delete('/chart-of-accounts/:id', async (req, res, next) => {
    try {
      await coaSvc.deleteAccount(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Account deleted' });
    } catch (e) { next(e); }
  });

  // ─── Pricelists ───
  router.get('/pricelists', async (req, res, next) => {
    try {
      const result = await pricelistsSvc.listPricelists(db, req.orgId!, {
        page: parseInt(req.query.page as string) || 1, limit: parseInt(req.query.limit as string) || 25,
        search: req.query.search as string,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  });

  router.get('/pricelists/:id', async (req, res, next) => {
    try {
      const pricelist = await pricelistsSvc.getPricelistById(db, req.orgId!, req.params.id);
      if (!pricelist) return res.status(404).json({ success: false, error: 'Pricelist not found' });
      res.json({ success: true, data: pricelist });
    } catch (e) { next(e); }
  });

  router.post('/pricelists', async (req, res, next) => {
    try {
      const pricelist = await pricelistsSvc.createPricelist(db, req.orgId!, req.body);
      res.status(201).json({ success: true, data: pricelist });
    } catch (e) { next(e); }
  });

  router.put('/pricelists/:id', async (req, res, next) => {
    try {
      const pricelist = await pricelistsSvc.updatePricelist(db, req.orgId!, req.params.id, req.body);
      if (!pricelist) return res.status(404).json({ success: false, error: 'Pricelist not found' });
      res.json({ success: true, data: pricelist });
    } catch (e) { next(e); }
  });

  router.delete('/pricelists/:id', async (req, res, next) => {
    try {
      await pricelistsSvc.deletePricelist(db, req.orgId!, req.params.id);
      res.json({ success: true, message: 'Pricelist deleted' });
    } catch (e) { next(e); }
  });

  return router;
}
