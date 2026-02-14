import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq, and } from 'drizzle-orm';
import { erpInvoices, erpInvoiceItems, erpClients, organizations } from '@nexus/database';
import type { Database } from '@nexus/database';
import { InvoiceTemplate } from '../pdf/invoice-template.js';
import type { InvoicePdfData } from '../pdf/invoice-template.js';

export async function generateInvoicePdf(
  db: Database,
  orgId: string,
  invoiceId: string,
): Promise<{ buffer: Buffer; invoiceNumber: string }> {
  const [invoice] = await db
    .select()
    .from(erpInvoices)
    .where(and(eq(erpInvoices.id, invoiceId), eq(erpInvoices.orgId, orgId)))
    .limit(1);

  if (!invoice) throw new Error('Invoice not found');

  const items = await db
    .select()
    .from(erpInvoiceItems)
    .where(eq(erpInvoiceItems.invoiceId, invoiceId));

  const [client] = invoice.clientId
    ? await db.select().from(erpClients).where(eq(erpClients.id, invoice.clientId)).limit(1)
    : [null];

  const [org] = await db
    .select({
      name: organizations.name,
      companyAddress: organizations.companyAddress,
      companyTaxId: organizations.companyTaxId,
      companyPhone: organizations.companyPhone,
      companyEmail: organizations.companyEmail,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  const data: InvoicePdfData = {
    company: {
      name: org?.name || 'Company',
      address: org?.companyAddress,
      taxId: org?.companyTaxId,
      phone: org?.companyPhone,
      email: org?.companyEmail,
    },
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type ?? 'invoice',
      status: invoice.status ?? 'draft',
      issueDate: invoice.issueDate?.toISOString() ?? null,
      dueDate: invoice.dueDate?.toISOString() ?? null,
      subtotal: String(invoice.subtotal ?? '0'),
      tax: String(invoice.tax ?? '0'),
      discount: String(invoice.discount ?? '0'),
      total: String(invoice.total ?? '0'),
      amountPaid: String(invoice.amountPaid ?? '0'),
      balanceDue: String(invoice.balanceDue ?? '0'),
    },
    client: client
      ? {
          name: client.name,
          taxId: client.taxId,
          billingAddress: client.billingAddress as Record<string, unknown> | null,
        }
      : null,
    items: items.map((item) => ({
      description: item.description || '—',
      quantity: String(item.quantity ?? 0),
      unitPrice: String(item.unitPrice ?? 0),
      taxRate: String(item.taxRate ?? 0),
      lineTotal: String(item.lineTotal ?? 0),
    })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(InvoiceTemplate, { data }) as any;
  const buffer = await renderToBuffer(element);

  return { buffer: Buffer.from(buffer), invoiceNumber: invoice.invoiceNumber };
}
