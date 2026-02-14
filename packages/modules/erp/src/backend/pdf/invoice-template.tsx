import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export interface InvoicePdfData {
  company: {
    name: string;
    address?: string | null;
    taxId?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    type: string;
    status: string;
    issueDate?: string | null;
    dueDate?: string | null;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    amountPaid: string;
    balanceDue: string;
  };
  client: {
    name: string;
    taxId?: string | null;
    billingAddress?: Record<string, unknown> | null;
  } | null;
  items: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>;
}

function fmt(val: unknown): string {
  const n = parseFloat(String(val || '0'));
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAddress(addr: Record<string, unknown> | null | undefined): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.street) parts.push(String(addr.street));
  if (addr.city || addr.state || addr.zip) {
    const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).map(String).join(', ');
    if (cityLine) parts.push(cityLine);
  }
  if (addr.country) parts.push(String(addr.country));
  return parts.join('\n');
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color: '#444444',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    marginBottom: 6,
  },
  invoiceMeta: {
    fontSize: 9,
    textAlign: 'right',
    marginBottom: 2,
  },
  billTo: {
    marginBottom: 20,
  },
  billToLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  billToText: {
    fontSize: 9,
    color: '#333333',
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    fontSize: 9,
  },
  colDesc: { width: '40%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '16%', textAlign: 'right' },
  colTax: { width: '12%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsBlock: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    marginBottom: 3,
  },
  totalLabel: {
    width: 100,
    fontSize: 9,
  },
  totalValue: {
    width: 100,
    textAlign: 'right',
    fontSize: 9,
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: 200,
    marginBottom: 3,
  },
  totalLabelBold: {
    width: 100,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  totalValueBold: {
    width: 100,
    textAlign: 'right',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#888888',
  },
});

export function InvoiceTemplate({ data }: { data: InvoicePdfData }) {
  const { company, invoice, client, items } = data;
  const isCredit = invoice.type === 'credit_note';
  const hasTax = parseFloat(invoice.tax) > 0;
  const hasDiscount = parseFloat(invoice.discount) > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            {company.address && <Text style={styles.companyDetail}>{company.address}</Text>}
            {company.phone && <Text style={styles.companyDetail}>{company.phone}</Text>}
            {company.email && <Text style={styles.companyDetail}>{company.email}</Text>}
            {company.taxId && <Text style={styles.companyDetail}>Tax ID: {company.taxId}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{isCredit ? 'CREDIT NOTE' : 'INVOICE'}</Text>
            <Text style={styles.invoiceMeta}>Number: {invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceMeta}>Date: {formatDate(invoice.issueDate)}</Text>
            <Text style={styles.invoiceMeta}>Due: {formatDate(invoice.dueDate)}</Text>
            <Text style={styles.invoiceMeta}>Status: {invoice.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Bill To */}
        {client && (
          <View style={styles.billTo}>
            <Text style={styles.billToLabel}>Bill To:</Text>
            <Text style={styles.billToText}>{client.name}</Text>
            {client.taxId && <Text style={styles.billToText}>Tax ID: {client.taxId}</Text>}
            {client.billingAddress && (
              <Text style={styles.billToText}>{formatAddress(client.billingAddress)}</Text>
            )}
          </View>
        )}

        {/* Line Items Table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Unit Price</Text>
          <Text style={styles.colTax}>Tax %</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>
        {items.map((item, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.colDesc}>{item.description || '—'}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>{fmt(item.unitPrice)}</Text>
            <Text style={styles.colTax}>{item.taxRate}%</Text>
            <Text style={styles.colTotal}>{fmt(item.lineTotal)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {hasTax && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{fmt(invoice.tax)}</Text>
            </View>
          )}
          {hasDiscount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-{fmt(invoice.discount)}</Text>
            </View>
          )}
          <View style={styles.totalRowBold}>
            <Text style={styles.totalLabelBold}>Total:</Text>
            <Text style={styles.totalValueBold}>{fmt(invoice.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Paid:</Text>
            <Text style={styles.totalValue}>{fmt(invoice.amountPaid)}</Text>
          </View>
          <View style={styles.totalRowBold}>
            <Text style={styles.totalLabelBold}>Balance Due:</Text>
            <Text style={styles.totalValueBold}>{fmt(invoice.balanceDue)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Generated by Nexus Platform</Text>
      </Page>
    </Document>
  );
}
