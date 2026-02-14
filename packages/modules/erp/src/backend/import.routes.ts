import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, count } from 'drizzle-orm';
import '@nexus/types';
import type { Database } from '@nexus/database';
import { importJobs } from '@nexus/database';
import * as importSvc from './services/import.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// ─── CSV Template Data ───

const templates: Record<string, { headers: string[]; rows: string[][] }> = {
  clients: {
    headers: ['Name', 'Type', 'Tax ID', 'Billing Address', 'Payment Terms', 'Currency', 'Opening Balance', 'Opening Balance Date'],
    rows: [
      ['Acme Corp', 'customer', 'US-12345678', '123 Main St, New York, NY 10001', 'net_30', 'USD', '1500.00', '2024-01-01'],
      ['Global Industries', 'customer', 'US-87654321', '456 Oak Ave, Los Angeles, CA 90001', 'net_15', 'USD', '0.00', ''],
      ['Smith Consulting', 'vendor', '', '789 Pine Rd, Chicago, IL 60601', 'net_30', 'USD', '250.00', '2024-01-01'],
    ],
  },
  inventory: {
    headers: ['Name', 'SKU', 'Type', 'Unit Price', 'Cost Price', 'Tax Rate', 'Quantity On Hand', 'Unit'],
    rows: [
      ['Widget A', 'WDG-001', 'product', '29.99', '15.00', '10', '100', 'unit'],
      ['Consulting Hour', 'SVC-001', 'service', '150.00', '0', '0', '0', 'hour'],
      ['Office Chair', 'FRN-010', 'product', '249.00', '120.00', '10', '25', 'unit'],
    ],
  },
  invoices: {
    headers: ['Client Name', 'Issue Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total'],
    rows: [
      ['Acme Corp', '2024-01-15', '2024-02-14', 'issued', '1000.00', '100.00', '1100.00'],
      ['Global Industries', '2024-02-01', '2024-03-02', 'draft', '2500.00', '250.00', '2750.00'],
    ],
  },
  payments: {
    headers: ['Client Name', 'Amount', 'Payment Date', 'Payment Method', 'Invoice Number', 'Reference'],
    rows: [
      ['Acme Corp', '500.00', '2024-01-20', 'bank_transfer', 'INV-0001', 'January payment'],
      ['Global Industries', '2750.00', '2024-02-15', 'credit_card', 'INV-0002', 'Full payment'],
    ],
  },
};

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map(escape).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// ─── Router ───

export function createImportRouter(db: Database): Router {
  const router = Router();

  // 1. POST /analyze — upload CSV, analyze, create job
  router.post('/analyze', upload.single('file'), async (req, res, next) => {
    try {
      const entityType = req.query.entityType as string;
      if (!entityType) {
        return res.status(400).json({ success: false, error: 'entityType query parameter is required' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
      }

      const csvContent = file.buffer.toString('utf-8');
      const analysis = importSvc.analyzeCSV(csvContent, entityType);

      const jobId = uuidv4();
      await db.insert(importJobs).values({
        id: jobId,
        orgId: req.orgId!,
        entityType,
        fileName: file.originalname || 'upload.csv',
        rawData: csvContent,
        totalRows: analysis.totalRows,
        status: 'pending',
      });

      res.status(201).json({
        success: true,
        data: {
          jobId,
          columns: analysis.columns,
          suggestedMapping: analysis.suggestedMapping,
          requiredFields: analysis.requiredFields,
          totalRows: analysis.totalRows,
        },
      });
    } catch (e: any) {
      if (e.message?.startsWith('Unknown entity type')) {
        return res.status(400).json({ success: false, error: e.message });
      }
      next(e);
    }
  });

  // 2. PUT /:jobId/mapping — update confirmed mapping
  router.put('/:jobId/mapping', async (req, res, next) => {
    try {
      const { mapping } = req.body;
      if (!mapping || !Array.isArray(mapping)) {
        return res.status(400).json({ success: false, error: 'mapping array is required' });
      }

      const [job] = await db
        .select({ id: importJobs.id })
        .from(importJobs)
        .where(and(eq(importJobs.id, req.params.jobId), eq(importJobs.orgId, req.orgId!)))
        .limit(1);

      if (!job) return res.status(404).json({ success: false, error: 'Import job not found' });

      await db
        .update(importJobs)
        .set({ mapping: mapping as any, updatedAt: new Date() })
        .where(eq(importJobs.id, req.params.jobId));

      res.json({ success: true });
    } catch (e) { next(e); }
  });

  // 3. POST /:jobId/validate — validate mapping against data
  router.post('/:jobId/validate', async (req, res, next) => {
    try {
      const mapping = req.body.mapping as importSvc.MappingEntry[] | undefined;

      // If mapping sent in body, use that; otherwise use stored mapping
      const [job] = await db
        .select()
        .from(importJobs)
        .where(and(eq(importJobs.id, req.params.jobId), eq(importJobs.orgId, req.orgId!)))
        .limit(1);

      if (!job) return res.status(404).json({ success: false, error: 'Import job not found' });

      const finalMapping = mapping || (job.mapping as unknown as importSvc.MappingEntry[]);
      if (!finalMapping || !Array.isArray(finalMapping)) {
        return res.status(400).json({ success: false, error: 'No mapping available — send mapping in body or set via PUT' });
      }

      const result = await importSvc.validateMapping(db, req.orgId!, req.params.jobId, finalMapping);

      res.json({
        success: true,
        data: {
          valid: result.valid,
          preview: result.preview,
          errors: result.errors,
          warnings: [],
        },
      });
    } catch (e: any) {
      if (e.message === 'Import job not found') return res.status(404).json({ success: false, error: e.message });
      next(e);
    }
  });

  // 4. POST /:jobId/execute — run the import
  router.post('/:jobId/execute', async (req, res, next) => {
    try {
      const [job] = await db
        .select({ id: importJobs.id, status: importJobs.status })
        .from(importJobs)
        .where(and(eq(importJobs.id, req.params.jobId), eq(importJobs.orgId, req.orgId!)))
        .limit(1);

      if (!job) return res.status(404).json({ success: false, error: 'Import job not found' });

      if (job.status !== 'validated') {
        return res.status(400).json({
          success: false,
          error: `Cannot execute import — job status is "${job.status}", must be "validated"`,
        });
      }

      const result = await importSvc.executeImport(db, req.orgId!, req.params.jobId);

      res.json({ success: true, data: result });
    } catch (e: any) {
      if (e.message === 'Import job not found') return res.status(404).json({ success: false, error: e.message });
      next(e);
    }
  });

  // 5. POST /:jobId/rollback — undo the import
  router.post('/:jobId/rollback', async (req, res, next) => {
    try {
      const result = await importSvc.rollbackImport(db, req.orgId!, req.params.jobId);
      res.json({ success: true, data: result });
    } catch (e: any) {
      if (e.message === 'Import job not found') return res.status(404).json({ success: false, error: e.message });
      next(e);
    }
  });

  // 6. GET /jobs — list import jobs for org
  router.get('/jobs', async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      const offset = (page - 1) * limit;

      const [{ total }] = await db
        .select({ total: count() })
        .from(importJobs)
        .where(eq(importJobs.orgId, req.orgId!));

      const jobs = await db
        .select({
          id: importJobs.id,
          entityType: importJobs.entityType,
          status: importJobs.status,
          fileName: importJobs.fileName,
          totalRows: importJobs.totalRows,
          processedRows: importJobs.processedRows,
          importedRows: importJobs.importedRows,
          createdAt: importJobs.createdAt,
          updatedAt: importJobs.updatedAt,
        })
        .from(importJobs)
        .where(eq(importJobs.orgId, req.orgId!))
        .orderBy(desc(importJobs.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({
        success: true,
        data: jobs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (e) { next(e); }
  });

  // 7. GET /:jobId — get single job detail
  router.get('/:jobId', async (req, res, next) => {
    try {
      const [job] = await db
        .select({
          id: importJobs.id,
          entityType: importJobs.entityType,
          status: importJobs.status,
          fileName: importJobs.fileName,
          mapping: importJobs.mapping,
          totalRows: importJobs.totalRows,
          processedRows: importJobs.processedRows,
          importedRows: importJobs.importedRows,
          errors: importJobs.errors,
          createdIds: importJobs.createdIds,
          createdAt: importJobs.createdAt,
          updatedAt: importJobs.updatedAt,
        })
        .from(importJobs)
        .where(and(eq(importJobs.id, req.params.jobId), eq(importJobs.orgId, req.orgId!)))
        .limit(1);

      if (!job) return res.status(404).json({ success: false, error: 'Import job not found' });

      res.json({ success: true, data: job });
    } catch (e) { next(e); }
  });

  // 8. GET /templates/:entityType — download sample CSV
  router.get('/templates/:entityType', (req, res) => {
    const entityType = req.params.entityType;
    const template = templates[entityType];
    if (!template) {
      return res.status(400).json({ success: false, error: `Unknown entity type: ${entityType}` });
    }

    const csv = toCSV(template.headers, template.rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entityType}-template.csv"`);
    res.send(csv);
  });

  return router;
}
