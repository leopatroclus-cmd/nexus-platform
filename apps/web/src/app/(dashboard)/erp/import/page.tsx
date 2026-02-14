'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Users2, Package, FileText, CreditCard,
  Download, CheckCircle2, AlertTriangle, XCircle,
  ArrowLeft, ArrowRight, Loader2, RotateCcw, ExternalLink,
  ChevronDown,
} from 'lucide-react';

// ─── Types ───

interface ColumnAnalysis {
  name: string;
  inferredType: string;
  samples: string[];
}

interface SuggestedMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
}

interface MappingEntry {
  sourceColumn: string;
  targetField: string;
  transform?: string;
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface EntityField {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface AnalysisResult {
  jobId: string;
  columns: ColumnAnalysis[];
  suggestedMapping: SuggestedMapping[];
  requiredFields: string[];
  totalRows: number;
}

interface ValidationResult {
  valid: boolean;
  preview: Record<string, unknown>[];
  errors: ImportError[];
  warnings: string[];
}

interface ImportJob {
  id: string;
  entityType: string;
  status: string;
  fileName: string;
  totalRows: number;
  processedRows: number;
  importedRows: number;
  errors: ImportError[];
  createdIds: string[];
}

// ─── Entity Config ───

const ENTITIES = [
  {
    key: 'clients',
    label: 'Clients',
    description: 'Import customers, vendors, and business contacts',
    icon: Users2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    required: ['name'],
    viewPath: '/erp/clients',
  },
  {
    key: 'inventory',
    label: 'Products & Services',
    description: 'Import inventory items, products, and services',
    icon: Package,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    required: ['name'],
    viewPath: '/erp/inventory',
  },
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Import invoice headers (requires existing clients)',
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    required: ['clientName', 'issueDate'],
    viewPath: '/erp/invoices',
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Import payment records (requires existing clients)',
    icon: CreditCard,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    required: ['clientName', 'amount', 'paymentDate'],
    viewPath: '/erp/payments',
  },
] as const;

type EntityKey = (typeof ENTITIES)[number]['key'];

// ─── Steps ───

const STEPS = ['Select Type', 'Upload CSV', 'Map Fields', 'Preview', 'Import'] as const;

export default function ImportPage() {
  const [step, setStep] = useState(0);
  const [entityType, setEntityType] = useState<EntityKey | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [mapping, setMapping] = useState<MappingEntry[]>([]);
  const [entityFields, setEntityFields] = useState<EntityField[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: ImportError[] } | null>(null);

  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Step 1: Select Entity ───

  const handleEntitySelect = (key: EntityKey) => {
    setEntityType(key);
    setStep(1);
    setError(null);
  };

  const handleDownloadTemplate = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.get(`/erp/import/templates/${key}`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${key}-template.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download template');
    }
  };

  // ─── Step 2: Upload ───

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) {
      setFile(dropped);
      setError(null);
    } else {
      setError('Please upload a .csv file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !entityType) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/erp/import/analyze?entityType=${entityType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = data.data as AnalysisResult;
      setAnalysis(result);
      setJobId(result.jobId);

      // Fetch entity schema for field dropdowns
      const schemaRes = await api.get(`/erp/import/templates/${entityType}`);
      // We already know the fields from the suggested mapping; fetch entity fields from analysis
      // We'll build the field list from the entity config
      const fieldsForEntity = getFieldsForEntity(entityType);
      setEntityFields(fieldsForEntity);

      // Build initial mapping from suggested mapping
      const initialMapping: MappingEntry[] = result.suggestedMapping.map((sm) => ({
        sourceColumn: sm.sourceColumn,
        targetField: sm.targetField,
      }));
      setMapping(initialMapping);

      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze CSV');
    } finally {
      setUploading(false);
    }
  };

  // ─── Step 3: Map Fields ───

  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMapping((prev) => {
      // Remove any existing mapping for this source column
      const filtered = prev.filter((m) => m.sourceColumn !== sourceColumn);
      if (targetField) {
        // Remove any other mapping targeting the same field (prevent duplicates)
        const deduped = filtered.filter((m) => m.targetField !== targetField);
        return [...deduped, { sourceColumn, targetField }];
      }
      return filtered;
    });
  };

  const getMappedTarget = (sourceColumn: string): string => {
    return mapping.find((m) => m.sourceColumn === sourceColumn)?.targetField || '';
  };

  const getConfidence = (sourceColumn: string): number => {
    return analysis?.suggestedMapping.find((sm) => sm.sourceColumn === sourceColumn)?.confidence || 0;
  };

  const allRequiredMapped = analysis
    ? analysis.requiredFields.every((req) => mapping.some((m) => m.targetField === req))
    : false;

  // ─── Step 4: Validate ───

  const handleValidate = async () => {
    if (!jobId) return;
    setValidating(true);
    setError(null);
    try {
      const { data } = await api.post(`/erp/import/${jobId}/validate`, { mapping });
      setValidation(data.data as ValidationResult);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  // ─── Step 5: Execute ───

  const handleExecute = async () => {
    if (!jobId) return;
    setImporting(true);
    setError(null);
    setStep(4);
    try {
      const { data } = await api.post(`/erp/import/${jobId}/execute`);
      setImportResult(data.data);

      // Poll for final status
      const pollJob = async () => {
        const { data: jd } = await api.get(`/erp/import/${jobId}`);
        setJob(jd.data);
      };
      await pollJob();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
      // Still fetch job for status
      try {
        const { data: jd } = await api.get(`/erp/import/${jobId}`);
        setJob(jd.data);
      } catch { /* ignore */ }
    } finally {
      setImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!jobId) return;
    if (!window.confirm('This will delete all imported records. Are you sure?')) return;
    setRollingBack(true);
    try {
      const { data } = await api.post(`/erp/import/${jobId}/rollback`);
      setImportResult(null);
      setJob(null);
      setStep(0);
      setEntityType(null);
      setFile(null);
      setAnalysis(null);
      setMapping([]);
      setValidation(null);
      setJobId(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Rollback failed');
    } finally {
      setRollingBack(false);
    }
  };

  const handleStartOver = () => {
    setStep(0);
    setEntityType(null);
    setFile(null);
    setAnalysis(null);
    setMapping([]);
    setEntityFields([]);
    setValidation(null);
    setJobId(null);
    setJob(null);
    setImportResult(null);
    setError(null);
  };

  const entityConfig = entityType ? ENTITIES.find((e) => e.key === entityType) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl tracking-tight">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Migrate your data from spreadsheets into Nexus
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <div className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              i < step ? 'bg-primary/10 text-primary' :
              i === step ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' :
              'bg-secondary text-muted-foreground',
            )}>
              {i < step ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <span className="w-3.5 text-center">{i + 1}</span>
              )}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-6', i < step ? 'bg-primary/40' : 'bg-border')} />
            )}
          </div>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* ─── Step 1: Select Entity Type ─── */}
      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {ENTITIES.map((entity) => {
            const Icon = entity.icon;
            return (
              <Card
                key={entity.key}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
                  entityType === entity.key && 'ring-2 ring-primary',
                )}
                onClick={() => handleEntitySelect(entity.key)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', entity.bg)}>
                      <Icon className={cn('h-5 w-5', entity.color)} />
                    </div>
                    <button
                      onClick={(e) => handleDownloadTemplate(entity.key, e)}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Template
                    </button>
                  </div>
                  <CardTitle className="mt-3">{entity.label}</CardTitle>
                  <CardDescription>{entity.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {entity.required.map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px]">
                        {f} (required)
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Step 2: Upload CSV ─── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Upload a .csv file with your {entityConfig?.label.toLowerCase()} data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors',
                file ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-secondary/30',
              )}
            >
              <Upload className={cn('h-10 w-10 mb-3', file ? 'text-primary' : 'text-muted-foreground')} />
              {file ? (
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setFile(null)}
                    className="mt-2 text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium">Drag and drop your CSV file here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                </div>
              )}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="absolute inset-0 cursor-pointer opacity-0"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => { setStep(0); setFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 3: Map Fields ─── */}
      {step === 2 && analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Map Fields</CardTitle>
                <CardDescription>
                  Match your CSV columns to Nexus fields.
                  Found {analysis.totalRows} rows, {analysis.columns.length} columns.
                </CardDescription>
              </div>
              <Badge variant={allRequiredMapped ? 'success' : 'warning'}>
                {allRequiredMapped ? 'Ready' : 'Required fields missing'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.columns.map((col) => {
              const mappedTarget = getMappedTarget(col.name);
              const confidence = getConfidence(col.name);
              const isRequired = mappedTarget && analysis.requiredFields.includes(mappedTarget);
              const requiredUnmapped = analysis.requiredFields.filter(
                (req) => !mapping.some((m) => m.targetField === req),
              );

              return (
                <div
                  key={col.name}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border/60 bg-secondary/20 p-3"
                >
                  {/* Source column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{col.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {col.inferredType}
                      </Badge>
                      {confidence > 0 && mappedTarget && (
                        <span className={cn(
                          'text-[10px] font-medium',
                          confidence >= 0.8 ? 'text-emerald-400' :
                          confidence >= 0.5 ? 'text-amber-400' : 'text-muted-foreground',
                        )}>
                          {Math.round(confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    {col.samples.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        e.g. {col.samples.slice(0, 3).join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground shrink-0" />

                  {/* Target field dropdown */}
                  <div className="relative sm:w-52 shrink-0">
                    <select
                      value={mappedTarget}
                      onChange={(e) => updateMapping(col.name, e.target.value)}
                      className={cn(
                        'w-full appearance-none rounded-lg border bg-secondary/50 px-3 py-2 pr-8 text-sm transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
                        !mappedTarget && requiredUnmapped.length > 0 && 'border-amber-500/50',
                        mappedTarget && 'border-primary/30 bg-primary/5',
                      )}
                    >
                      <option value="">-- Skip --</option>
                      {entityFields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name}{field.required ? ' *' : ''} - {field.description}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              );
            })}

            {/* Required fields not mapped warning */}
            {!allRequiredMapped && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Missing required fields:{' '}
                {analysis.requiredFields
                  .filter((req) => !mapping.some((m) => m.targetField === req))
                  .join(', ')}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => { setStep(1); setAnalysis(null); setMapping([]); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleValidate} disabled={!allRequiredMapped || validating}>
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Validate
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Step 4: Preview & Validate ─── */}
      {step === 3 && validation && (
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Data Preview</CardTitle>
                  <CardDescription>
                    Review how your data will appear in Nexus
                  </CardDescription>
                </div>
                <Badge variant={validation.valid ? 'success' : 'destructive'}>
                  {validation.valid ? 'Valid' : `${validation.errors.length} errors`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Preview table */}
              {validation.preview.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-secondary/30">
                        {mapping.map((m) => (
                          <th key={m.targetField} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                            {m.targetField}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validation.preview.map((row, i) => (
                        <tr key={i} className="border-b border-border/30 last:border-0">
                          {mapping.map((m) => (
                            <td key={m.targetField} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                              {formatPreviewValue(row[m.targetField])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Errors ({validation.errors.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5 divide-y divide-destructive/10">
                    {validation.errors.slice(0, 20).map((err, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Row {err.row}</span>
                        {err.field && <span className="text-muted-foreground"> / {err.field}</span>}
                        <span className="text-destructive ml-2">{err.message}</span>
                      </div>
                    ))}
                    {validation.errors.length > 20 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        ...and {validation.errors.length - 20} more errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Adjust Mapping
                </Button>
                <Button onClick={handleExecute} disabled={!validation.valid}>
                  Import {analysis?.totalRows} records
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Step 5: Import Progress & Results ─── */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {importing ? 'Importing...' : 'Import Complete'}
            </CardTitle>
            <CardDescription>
              {importing
                ? `Processing your ${entityConfig?.label.toLowerCase()} data`
                : 'Your data has been imported into Nexus'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            {importing && (
              <div className="space-y-2">
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all duration-300 shimmer" style={{ width: '100%' }} />
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing records...
                </div>
              </div>
            )}

            {/* Results */}
            {!importing && importResult && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <div>
                      <p className="text-2xl font-bold text-emerald-400">{importResult.imported}</p>
                      <p className="text-xs text-muted-foreground">Records imported</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
                    <AlertTriangle className="h-8 w-8 text-amber-400" />
                    <div>
                      <p className="text-2xl font-bold text-amber-400">{importResult.skipped}</p>
                      <p className="text-xs text-muted-foreground">Records skipped</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <p className="text-2xl font-bold text-destructive">{importResult.errors.length}</p>
                      <p className="text-xs text-muted-foreground">Errors</p>
                    </div>
                  </div>
                </div>

                {/* Error details */}
                {importResult.errors.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-destructive/20 bg-destructive/5 divide-y divide-destructive/10">
                    {importResult.errors.slice(0, 15).map((err, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Row {err.row}</span>
                        {err.field && <span className="text-muted-foreground"> / {err.field}</span>}
                        <span className="text-destructive ml-2">{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {entityConfig && (
                    <Button asChild>
                      <a href={entityConfig.viewPath}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View {entityConfig.label}
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleStartOver}>
                    Import More Data
                  </Button>
                  {importResult.imported > 0 && (
                    <Button variant="destructive" onClick={handleRollback} disabled={rollingBack} className="ml-auto">
                      {rollingBack ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Rolling back...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Rollback Import
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Error state */}
            {!importing && !importResult && error && (
              <div className="flex flex-col items-center gap-4 py-8">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm text-muted-foreground">Import failed. Please try again.</p>
                <Button variant="outline" onClick={handleStartOver}>Start Over</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatPreviewValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)) && String(val).length > 8 && String(val).includes('-'))) {
    try {
      const d = new Date(val as string);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    } catch { /* fall through */ }
  }
  return String(val);
}

function getFieldsForEntity(entityType: string): EntityField[] {
  const schemas: Record<string, EntityField[]> = {
    clients: [
      { name: 'name', type: 'string', required: true, description: 'Client/company name' },
      { name: 'type', type: 'string', required: false, description: 'Client type' },
      { name: 'taxId', type: 'string', required: false, description: 'Tax ID' },
      { name: 'billingAddress', type: 'string', required: false, description: 'Billing address' },
      { name: 'shippingAddress', type: 'string', required: false, description: 'Shipping address' },
      { name: 'paymentTerms', type: 'string', required: false, description: 'Payment terms' },
      { name: 'currency', type: 'string', required: false, description: 'Currency code' },
      { name: 'openingBalance', type: 'number', required: false, description: 'Opening balance' },
      { name: 'openingBalanceDate', type: 'date', required: false, description: 'Balance date' },
    ],
    inventory: [
      { name: 'name', type: 'string', required: true, description: 'Product/service name' },
      { name: 'sku', type: 'string', required: false, description: 'SKU code' },
      { name: 'type', type: 'string', required: false, description: 'Item type' },
      { name: 'unitPrice', type: 'number', required: false, description: 'Selling price' },
      { name: 'costPrice', type: 'number', required: false, description: 'Cost price' },
      { name: 'taxRate', type: 'number', required: false, description: 'Tax rate %' },
      { name: 'quantityOnHand', type: 'number', required: false, description: 'Stock quantity' },
      { name: 'unit', type: 'string', required: false, description: 'Unit of measure' },
    ],
    invoices: [
      { name: 'clientName', type: 'string', required: true, description: 'Client name' },
      { name: 'issueDate', type: 'date', required: true, description: 'Issue date' },
      { name: 'dueDate', type: 'date', required: false, description: 'Due date' },
      { name: 'status', type: 'string', required: false, description: 'Status' },
      { name: 'subtotal', type: 'number', required: false, description: 'Subtotal' },
      { name: 'tax', type: 'number', required: false, description: 'Tax amount' },
      { name: 'total', type: 'number', required: false, description: 'Total amount' },
    ],
    payments: [
      { name: 'clientName', type: 'string', required: true, description: 'Client name' },
      { name: 'amount', type: 'number', required: true, description: 'Amount' },
      { name: 'paymentDate', type: 'date', required: true, description: 'Payment date' },
      { name: 'paymentMethod', type: 'string', required: false, description: 'Method' },
      { name: 'invoiceNumber', type: 'string', required: false, description: 'Invoice #' },
      { name: 'reference', type: 'string', required: false, description: 'Reference' },
    ],
  };
  return schemas[entityType] || [];
}
