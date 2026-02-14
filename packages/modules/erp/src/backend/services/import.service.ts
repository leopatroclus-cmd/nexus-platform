import { eq, and, inArray, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import {
  importJobs,
  organizations,
  erpClients,
  erpInventory,
  erpInvoices,
  erpPayments,
} from '@nexus/database';
import type { Database } from '@nexus/database';
import * as sequencesSvc from './sequences.service.js';

// ─── Types ───

export interface ColumnAnalysis {
  name: string;
  inferredType: string;
  samples: string[];
}

export interface SuggestedMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
}

export interface AnalysisResult {
  columns: ColumnAnalysis[];
  suggestedMapping: SuggestedMapping[];
  totalRows: number;
  requiredFields: string[];
}

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface MappingEntry {
  sourceColumn: string;
  targetField: string;
  transform?: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  preview: Record<string, unknown>[];
  errors: ImportError[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// ─── Entity Schemas ───

const entitySchemas: Record<string, EntityField[]> = {
  clients: [
    { name: 'name', type: 'string', required: true, description: 'Client/company name' },
    { name: 'type', type: 'string', required: false, description: 'Client type (customer, vendor, or both)' },
    { name: 'taxId', type: 'string', required: false, description: 'Tax identification number' },
    { name: 'billingAddress', type: 'string', required: false, description: 'Billing address' },
    { name: 'shippingAddress', type: 'string', required: false, description: 'Shipping address' },
    { name: 'paymentTerms', type: 'string', required: false, description: 'Payment terms (e.g. net_30)' },
    { name: 'currency', type: 'string', required: false, description: 'Currency code (e.g. USD)' },
    { name: 'openingBalance', type: 'number', required: false, description: 'Opening balance amount' },
    { name: 'openingBalanceDate', type: 'date', required: false, description: 'Opening balance date' },
  ],
  inventory: [
    { name: 'name', type: 'string', required: true, description: 'Product/service name' },
    { name: 'sku', type: 'string', required: false, description: 'Stock keeping unit code' },
    { name: 'type', type: 'string', required: false, description: 'Item type (product or service)' },
    { name: 'unitPrice', type: 'number', required: false, description: 'Selling price per unit' },
    { name: 'costPrice', type: 'number', required: false, description: 'Cost price per unit' },
    { name: 'taxRate', type: 'number', required: false, description: 'Default tax rate (%)' },
    { name: 'quantityOnHand', type: 'number', required: false, description: 'Current stock quantity' },
    { name: 'unit', type: 'string', required: false, description: 'Unit of measure' },
  ],
  invoices: [
    { name: 'clientName', type: 'string', required: true, description: 'Client name (matched to existing clients)' },
    { name: 'issueDate', type: 'date', required: true, description: 'Invoice issue date' },
    { name: 'dueDate', type: 'date', required: false, description: 'Payment due date' },
    { name: 'status', type: 'string', required: false, description: 'Invoice status' },
    { name: 'subtotal', type: 'number', required: false, description: 'Subtotal amount' },
    { name: 'tax', type: 'number', required: false, description: 'Tax amount' },
    { name: 'total', type: 'number', required: false, description: 'Total amount' },
  ],
  payments: [
    { name: 'clientName', type: 'string', required: true, description: 'Client name (matched to existing clients)' },
    { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
    { name: 'paymentDate', type: 'date', required: true, description: 'Date of payment' },
    { name: 'paymentMethod', type: 'string', required: false, description: 'Payment method' },
    { name: 'invoiceNumber', type: 'string', required: false, description: 'Associated invoice number' },
    { name: 'reference', type: 'string', required: false, description: 'Payment reference/note' },
  ],
};

// ─── Field Aliases (for fuzzy column matching) ───

const fieldAliases: Record<string, Record<string, string[]>> = {
  clients: {
    name: ['customer name', 'client name', 'client', 'company name', 'business name', 'company', 'customer', 'name'],
    type: ['client type', 'type', 'category', 'customer type'],
    taxId: ['tax id', 'tax number', 'vat', 'vat number', 'tin', 'ein', 'tax identification', 'gst', 'abn'],
    billingAddress: ['billing address', 'address', 'street address', 'street', 'billing', 'location'],
    shippingAddress: ['shipping address', 'delivery address', 'ship to', 'shipping'],
    paymentTerms: ['payment terms', 'terms', 'pay terms', 'net terms'],
    currency: ['currency', 'currency code', 'cur'],
    openingBalance: ['opening balance', 'balance', 'amount owed', 'outstanding', 'starting balance', 'beginning balance', 'owed'],
    openingBalanceDate: ['opening balance date', 'balance date', 'as of date', 'start date', 'as of'],
  },
  inventory: {
    name: ['product name', 'item name', 'name', 'product', 'item', 'title'],
    sku: ['sku', 'item code', 'product code', 'code', 'part number', 'barcode', 'upc', 'item number'],
    type: ['type', 'item type', 'product type', 'category'],
    unitPrice: ['unit price', 'price', 'selling price', 'sale price', 'retail price', 'rate', 'sell price'],
    costPrice: ['cost price', 'cost', 'purchase price', 'buy price', 'wholesale price', 'cogs'],
    taxRate: ['tax rate', 'tax %', 'tax percent', 'vat rate', 'gst rate'],
    quantityOnHand: ['quantity', 'qty', 'stock', 'on hand', 'in stock', 'stock level', 'inventory count', 'stock quantity', 'quantity on hand'],
    unit: ['unit', 'uom', 'unit of measure', 'measure'],
  },
  invoices: {
    clientName: ['client', 'customer', 'client name', 'customer name', 'company', 'bill to', 'billed to'],
    issueDate: ['issue date', 'date', 'invoice date', 'created date', 'created'],
    dueDate: ['due date', 'payment due', 'due', 'pay by'],
    status: ['status', 'state', 'invoice status'],
    subtotal: ['subtotal', 'sub total', 'net amount', 'net total', 'net'],
    tax: ['tax', 'tax amount', 'vat', 'gst', 'sales tax'],
    total: ['total', 'grand total', 'amount', 'total amount', 'invoice total', 'invoice amount'],
  },
  payments: {
    clientName: ['client', 'customer', 'client name', 'customer name', 'company', 'payer', 'received from', 'from'],
    amount: ['amount', 'payment amount', 'total', 'sum', 'paid', 'payment'],
    paymentDate: ['payment date', 'date', 'received date', 'paid date', 'date received', 'date paid'],
    paymentMethod: ['payment method', 'method', 'pay method', 'payment type', 'type', 'mode'],
    invoiceNumber: ['invoice number', 'invoice', 'invoice #', 'inv number', 'invoice no', 'inv #', 'inv no'],
    reference: ['reference', 'ref', 'note', 'notes', 'memo', 'description', 'remarks'],
  },
};

// ─── CSV Parser ───

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || (char === '\r' && content[i + 1] === '\n')) && !inQuotes) {
      lines.push(current);
      current = '';
      if (char === '\r') i++;
    } else if (char === '\r' && !inQuotes) {
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === ',' && !inQ) {
        fields.push(field.trim());
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseLine(lines[0]);
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] ?? '';
      });
      return row;
    });

  return { headers, rows };
}

// ─── Type Inference ───

function inferColumnType(values: string[]): string {
  const nonEmpty = values.filter((v) => v.trim() !== '');
  if (nonEmpty.length === 0) return 'string';

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (nonEmpty.length >= 3 && nonEmpty.every((v) => emailRe.test(v))) return 'email';

  const phoneRe = /^[\d\s\-+().]+$/;
  if (nonEmpty.every((v) => phoneRe.test(v) && v.replace(/\D/g, '').length >= 7)) return 'phone';

  const boolVals = new Set(['true', 'false', 'yes', 'no', '0', '1']);
  if (nonEmpty.every((v) => boolVals.has(v.toLowerCase()))) return 'boolean';

  if (nonEmpty.every((v) => !isNaN(parseFloat(v)) && isFinite(Number(v)))) return 'number';

  if (nonEmpty.every((v) => !isNaN(Date.parse(v)) && v.length > 4)) return 'date';

  return 'string';
}

// ─── Fuzzy Matching ───

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  const wordsA = na.split(' ').filter(Boolean);
  const wordsB = nb.split(' ').filter(Boolean);
  const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
  if (overlap > 0) return 0.5 * (overlap / Math.max(wordsA.length, wordsB.length));
  return 0;
}

function matchColumn(columnName: string, entityType: string): SuggestedMapping | null {
  const aliases = fieldAliases[entityType];
  if (!aliases) return null;

  let best: SuggestedMapping = { sourceColumn: columnName, targetField: '', confidence: 0 };

  for (const [field, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      const sim = similarity(columnName, alias);
      if (sim > best.confidence) {
        best = { sourceColumn: columnName, targetField: field, confidence: sim };
      }
    }
  }

  return best.confidence >= 0.3 ? best : null;
}

// ─── Transform Helpers ───

function applyTransform(value: string, transform: string | undefined): unknown {
  if (!value && value !== '0') return null;
  switch (transform) {
    case 'toNumber': {
      const n = parseFloat(value.replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? null : n;
    }
    case 'toDate': {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    case 'toBoolean':
      return ['true', 'yes', '1'].includes(value.toLowerCase());
    case 'uppercase':
      return value.toUpperCase();
    case 'lowercase':
      return value.toLowerCase();
    case 'trim':
      return value.trim();
    default:
      return value.trim();
  }
}

function inferTransform(fieldType: string): string | undefined {
  switch (fieldType) {
    case 'number': return 'toNumber';
    case 'date': return 'toDate';
    case 'boolean': return 'toBoolean';
    default: return undefined;
  }
}

function applyMapping(row: Record<string, string>, mapping: MappingEntry[], schema: EntityField[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const entry of mapping) {
    const rawValue = row[entry.sourceColumn] ?? '';
    const fieldDef = schema.find((f) => f.name === entry.targetField);
    const transform = entry.transform || (fieldDef ? inferTransform(fieldDef.type) : undefined);
    result[entry.targetField] = applyTransform(rawValue, transform);
  }
  return result;
}

// ─── Public API ───

export function getEntitySchema(entityType: string): { fields: EntityField[] } {
  const fields = entitySchemas[entityType];
  if (!fields) throw new Error(`Unknown entity type: ${entityType}`);
  return { fields };
}

export function analyzeCSV(csvContent: string, entityType: string): AnalysisResult {
  if (!entitySchemas[entityType]) throw new Error(`Unknown entity type: ${entityType}`);

  const { headers, rows } = parseCSV(csvContent);
  const sampleRows = rows.slice(0, 100);

  const columns: ColumnAnalysis[] = headers.map((name) => {
    const values = sampleRows.map((r) => r[name] || '');
    return {
      name,
      inferredType: inferColumnType(values),
      samples: values.filter((v) => v.trim()).slice(0, 5),
    };
  });

  const suggestedMapping: SuggestedMapping[] = [];
  const usedTargets = new Set<string>();

  // Sort columns by best match confidence descending to avoid duplicate target assignments
  const candidates = headers
    .map((h) => matchColumn(h, entityType))
    .filter((m): m is SuggestedMapping => m !== null)
    .sort((a, b) => b.confidence - a.confidence);

  for (const candidate of candidates) {
    if (!usedTargets.has(candidate.targetField)) {
      usedTargets.add(candidate.targetField);
      suggestedMapping.push(candidate);
    }
  }

  const requiredFields = entitySchemas[entityType]
    .filter((f) => f.required)
    .map((f) => f.name);

  return { columns, suggestedMapping, totalRows: rows.length, requiredFields };
}

export async function validateMapping(
  db: Database,
  orgId: string,
  jobId: string,
  mapping: MappingEntry[],
): Promise<ValidationResult> {
  const [job] = await db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.id, jobId), eq(importJobs.orgId, orgId)))
    .limit(1);

  if (!job) throw new Error('Import job not found');
  if (!job.rawData) throw new Error('No CSV data stored for this job');

  const schema = entitySchemas[job.entityType];
  if (!schema) throw new Error(`Unknown entity type: ${job.entityType}`);

  const { rows } = parseCSV(job.rawData);
  const errors: ImportError[] = [];
  const requiredFields = schema.filter((f) => f.required).map((f) => f.name);

  // Check that all required fields are mapped
  const mappedTargets = new Set(mapping.map((m) => m.targetField));
  for (const req of requiredFields) {
    if (!mappedTargets.has(req)) {
      errors.push({ row: 0, field: req, message: `Required field "${req}" is not mapped to any column` });
    }
  }

  // Validate each row
  for (let i = 0; i < rows.length; i++) {
    const mapped = applyMapping(rows[i], mapping, schema);
    for (const req of requiredFields) {
      const val = mapped[req];
      if (val === null || val === undefined || val === '') {
        errors.push({ row: i + 1, field: req, message: `Missing required value for "${req}"` });
      }
    }
    // Type validation
    for (const entry of mapping) {
      const fieldDef = schema.find((f) => f.name === entry.targetField);
      if (!fieldDef) continue;
      const raw = rows[i][entry.sourceColumn];
      if (!raw || !raw.trim()) continue;
      if (fieldDef.type === 'number') {
        const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
        if (isNaN(n)) errors.push({ row: i + 1, field: entry.targetField, message: `Invalid number: "${raw}"` });
      } else if (fieldDef.type === 'date') {
        if (isNaN(Date.parse(raw))) errors.push({ row: i + 1, field: entry.targetField, message: `Invalid date: "${raw}"` });
      }
    }
  }

  // Build preview from first 5 rows
  const preview = rows.slice(0, 10).map((row) => applyMapping(row, mapping, schema));

  // Update job with mapping and validation results
  await db
    .update(importJobs)
    .set({
      mapping: mapping as any,
      errors: errors.slice(0, 100) as any, // Cap stored errors
      status: errors.length === 0 ? 'validated' : 'pending',
      totalRows: rows.length,
      updatedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));

  return { valid: errors.length === 0, preview, errors: errors.slice(0, 100) };
}

export async function executeImport(
  db: Database,
  orgId: string,
  jobId: string,
): Promise<ImportResult> {
  const [job] = await db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.id, jobId), eq(importJobs.orgId, orgId)))
    .limit(1);

  if (!job) throw new Error('Import job not found');
  if (!job.rawData) throw new Error('No CSV data stored for this job');
  if (!job.mapping) throw new Error('No mapping configured — run validation first');

  const schema = entitySchemas[job.entityType];
  if (!schema) throw new Error(`Unknown entity type: ${job.entityType}`);

  const mapping = job.mapping as unknown as MappingEntry[];
  const { rows } = parseCSV(job.rawData);

  await db
    .update(importJobs)
    .set({ status: 'importing', processedRows: 0, importedRows: 0, errors: [] as any, createdIds: [] as any, updatedAt: new Date() })
    .where(eq(importJobs.id, jobId));

  const createdIds: string[] = [];
  const errors: ImportError[] = [];
  let imported = 0;
  let skipped = 0;

  // Pre-fetch client name→ID lookup for invoices/payments
  let clientLookup: Map<string, string> | undefined;
  if (job.entityType === 'invoices' || job.entityType === 'payments') {
    const clients = await db
      .select({ id: erpClients.id, name: erpClients.name })
      .from(erpClients)
      .where(eq(erpClients.orgId, orgId));
    clientLookup = new Map(clients.map((c) => [c.name.toLowerCase(), c.id]));
  }

  // Pre-fetch invoice number→ID lookup for payments
  let invoiceLookup: Map<string, string> | undefined;
  if (job.entityType === 'payments') {
    const invoices = await db
      .select({ id: erpInvoices.id, invoiceNumber: erpInvoices.invoiceNumber })
      .from(erpInvoices)
      .where(eq(erpInvoices.orgId, orgId));
    invoiceLookup = new Map(invoices.map((inv) => [inv.invoiceNumber.toLowerCase(), inv.id]));
  }

  // Fetch org for invoice prefix
  let invoicePrefix = 'INV-';
  let paymentPrefix = 'PAY-';
  if (job.entityType === 'invoices' || job.entityType === 'payments') {
    const [org] = await db
      .select({ invoicePrefix: organizations.invoicePrefix })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    if (org?.invoicePrefix) invoicePrefix = org.invoicePrefix;
  }

  for (let i = 0; i < rows.length; i++) {
    try {
      const mapped = applyMapping(rows[i], mapping, schema);

      // Check required fields
      const requiredFields = schema.filter((f) => f.required).map((f) => f.name);
      const missingRequired = requiredFields.find((f) => !mapped[f] && mapped[f] !== 0);
      if (missingRequired) {
        errors.push({ row: i + 1, field: missingRequired, message: `Missing required value` });
        skipped++;
        continue;
      }

      const id = uuidv4();

      switch (job.entityType) {
        case 'clients': {
          await db.insert(erpClients).values({
            id,
            orgId,
            name: String(mapped.name),
            type: (mapped.type as string) || 'customer',
            taxId: mapped.taxId ? String(mapped.taxId) : null,
            billingAddress: mapped.billingAddress ? { street: String(mapped.billingAddress) } : null,
            shippingAddress: mapped.shippingAddress ? { street: String(mapped.shippingAddress) } : null,
            paymentTerms: mapped.paymentTerms ? String(mapped.paymentTerms) : null,
            currency: mapped.currency ? String(mapped.currency) : 'USD',
            openingBalance: mapped.openingBalance != null ? String(mapped.openingBalance) : '0',
            openingBalanceDate: mapped.openingBalanceDate instanceof Date ? mapped.openingBalanceDate : null,
          });
          break;
        }

        case 'inventory': {
          const sku = mapped.sku ? String(mapped.sku) : `IMP-${String(i + 1).padStart(4, '0')}`;
          await db.insert(erpInventory).values({
            id,
            orgId,
            name: String(mapped.name),
            sku,
            type: (mapped.type as string) || 'product',
            unit: mapped.unit ? String(mapped.unit) : 'unit',
            unitPrice: mapped.unitPrice != null ? String(mapped.unitPrice) : '0',
            costPrice: mapped.costPrice != null ? String(mapped.costPrice) : '0',
            taxRate: mapped.taxRate != null ? String(mapped.taxRate) : '0',
            quantityOnHand: mapped.quantityOnHand != null ? Math.round(Number(mapped.quantityOnHand)) : 0,
          });
          break;
        }

        case 'invoices': {
          const clientName = String(mapped.clientName).toLowerCase();
          const clientId = clientLookup?.get(clientName);
          if (!clientId) {
            errors.push({ row: i + 1, field: 'clientName', message: `Client not found: "${mapped.clientName}"` });
            skipped++;
            continue;
          }

          const invoiceNumber = await sequencesSvc.getNextNumber(db, orgId, 'invoice', invoicePrefix);
          const total = mapped.total != null ? Number(mapped.total) : 0;
          const subtotal = mapped.subtotal != null ? Number(mapped.subtotal) : total;
          const tax = mapped.tax != null ? Number(mapped.tax) : 0;
          const issueDate = mapped.issueDate instanceof Date ? mapped.issueDate : new Date();
          const dueDate = mapped.dueDate instanceof Date ? mapped.dueDate : new Date(issueDate.getTime() + 30 * 86400000);

          await db.insert(erpInvoices).values({
            id,
            orgId,
            invoiceNumber,
            type: 'invoice',
            status: (mapped.status as string) || 'draft',
            clientId,
            issueDate,
            dueDate,
            subtotal: String(subtotal),
            tax: String(tax),
            discount: '0',
            total: String(total),
            amountPaid: '0',
            balanceDue: String(total),
          });
          break;
        }

        case 'payments': {
          const pClientName = String(mapped.clientName).toLowerCase();
          const pClientId = clientLookup?.get(pClientName);
          if (!pClientId) {
            errors.push({ row: i + 1, field: 'clientName', message: `Client not found: "${mapped.clientName}"` });
            skipped++;
            continue;
          }

          let invoiceId: string | null = null;
          if (mapped.invoiceNumber && invoiceLookup) {
            invoiceId = invoiceLookup.get(String(mapped.invoiceNumber).toLowerCase()) ?? null;
          }

          const paymentNumber = await sequencesSvc.getNextNumber(db, orgId, 'payment', paymentPrefix);

          await db.insert(erpPayments).values({
            id,
            orgId,
            paymentNumber,
            clientId: pClientId,
            invoiceId,
            amount: String(mapped.amount ?? 0),
            paymentDate: mapped.paymentDate instanceof Date ? mapped.paymentDate : new Date(),
            paymentMethod: mapped.paymentMethod ? String(mapped.paymentMethod) : 'other',
            status: 'completed',
          });
          break;
        }
      }

      createdIds.push(id);
      imported++;
    } catch (err: any) {
      errors.push({ row: i + 1, field: '', message: err.message || 'Unknown error' });
      skipped++;
    }

    // Update progress every 50 rows
    if ((i + 1) % 50 === 0 || i === rows.length - 1) {
      await db
        .update(importJobs)
        .set({
          processedRows: i + 1,
          importedRows: imported,
          createdIds: createdIds as any,
          errors: errors.slice(0, 100) as any,
          updatedAt: new Date(),
        })
        .where(eq(importJobs.id, jobId));
    }
  }

  // Final update
  await db
    .update(importJobs)
    .set({
      status: errors.length === 0 ? 'completed' : (imported > 0 ? 'completed' : 'failed'),
      processedRows: rows.length,
      importedRows: imported,
      createdIds: createdIds as any,
      errors: errors.slice(0, 100) as any,
      updatedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));

  return { imported, skipped, errors: errors.slice(0, 100) };
}

export async function rollbackImport(
  db: Database,
  orgId: string,
  jobId: string,
): Promise<{ deleted: number }> {
  const [job] = await db
    .select()
    .from(importJobs)
    .where(and(eq(importJobs.id, jobId), eq(importJobs.orgId, orgId)))
    .limit(1);

  if (!job) throw new Error('Import job not found');

  const ids = (job.createdIds as string[]) || [];
  if (ids.length === 0) return { deleted: 0 };

  const tableMap: Record<string, typeof erpClients | typeof erpInventory | typeof erpInvoices | typeof erpPayments> = {
    clients: erpClients,
    inventory: erpInventory,
    invoices: erpInvoices,
    payments: erpPayments,
  };

  const table = tableMap[job.entityType];
  if (!table) throw new Error(`Unknown entity type: ${job.entityType}`);

  // Delete in batches of 100
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const result = await db.delete(table).where(inArray(table.id, batch));
    deleted += batch.length;
  }

  await db
    .update(importJobs)
    .set({
      status: 'failed',
      createdIds: [] as any,
      importedRows: 0,
      updatedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));

  return { deleted };
}
