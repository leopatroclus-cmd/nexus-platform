'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus, GripVertical, X, Type, Hash, Calendar, ToggleLeft,
  List, ListChecks, AtSign, Link, DollarSign, Pencil, Trash2, ChevronDown,
} from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'crm_contact', label: 'Contact', module: 'CRM' },
  { value: 'crm_company', label: 'Company', module: 'CRM' },
  { value: 'crm_deal', label: 'Deal', module: 'CRM' },
  { value: 'crm_activity', label: 'Activity', module: 'CRM' },
  { value: 'erp_client', label: 'Client', module: 'ERP' },
  { value: 'erp_inventory', label: 'Inventory Item', module: 'ERP' },
  { value: 'erp_order', label: 'Order', module: 'ERP' },
  { value: 'erp_invoice', label: 'Invoice', module: 'ERP' },
  { value: 'erp_payment', label: 'Payment', module: 'ERP' },
];

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type, description: 'Short or long text' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric value' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
  { value: 'boolean', label: 'Yes / No', icon: ToggleLeft, description: 'Toggle switch' },
  { value: 'select', label: 'Dropdown', icon: List, description: 'Single select' },
  { value: 'multiselect', label: 'Multi-select', icon: ListChecks, description: 'Multiple choices' },
  { value: 'email', label: 'Email', icon: AtSign, description: 'Email address' },
  { value: 'url', label: 'URL', icon: Link, description: 'Web link' },
  { value: 'currency', label: 'Currency', icon: DollarSign, description: 'Money amount' },
] as const;

interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

interface FieldDef {
  id: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options?: FieldOption[];
  isRequired: boolean;
  isFilterable: boolean;
  isActive: boolean;
  displayOrder: number;
  defaultValue?: unknown;
}

type WizardStep = 'name' | 'type' | 'configure' | 'settings';

export default function CustomFieldsPage() {
  const { org } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedEntity, setSelectedEntity] = useState(ENTITY_TYPES[0].value);
  const [showWizard, setShowWizard] = useState(false);
  const [editingField, setEditingField] = useState<FieldDef | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep>('name');
  const [entityDropdownOpen, setEntityDropdownOpen] = useState(false);

  // Wizard state
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(false);

  const { data: fields } = useQuery<FieldDef[]>({
    queryKey: ['custom-fields', org?.id, selectedEntity],
    queryFn: async () => {
      const { data } = await api.get(`/api/custom-fields/${selectedEntity}`);
      return data.data;
    },
    enabled: !!org?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/custom-fields', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      resetWizard();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/api/custom-fields/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      setEditingField(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/custom-fields/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] }),
  });

  const resetWizard = () => {
    setShowWizard(false);
    setWizardStep('name');
    setFieldLabel('');
    setFieldKey('');
    setFieldType('text');
    setOptions([]);
    setIsRequired(false);
    setIsFilterable(false);
  };

  const generateKey = (label: string) =>
    label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    const value = newOptionLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setOptions([...options, { value, label: newOptionLabel.trim() }]);
    setNewOptionLabel('');
  };

  const removeOption = (idx: number) => {
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleCreate = () => {
    createMutation.mutate({
      entityType: selectedEntity,
      fieldLabel,
      fieldKey: fieldKey || generateKey(fieldLabel),
      fieldType,
      options: ['select', 'multiselect'].includes(fieldType) ? options : undefined,
      isRequired,
      isFilterable,
    });
  };

  const needsOptions = fieldType === 'select' || fieldType === 'multiselect';
  const activeFields = (fields || []).filter((f) => f.isActive);
  const inactiveFields = (fields || []).filter((f) => !f.isActive);
  const selectedEntityInfo = ENTITY_TYPES.find((e) => e.value === selectedEntity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground">Add custom data fields to any entity type — no code needed.</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Field
        </Button>
      </div>

      {/* Entity type selector */}
      <div className="relative">
        <button
          onClick={() => setEntityDropdownOpen(!entityDropdownOpen)}
          className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/50"
        >
          <Badge variant="secondary">{selectedEntityInfo?.module}</Badge>
          {selectedEntityInfo?.label}
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
        </button>
        {entityDropdownOpen && (
          <div className="absolute z-10 mt-1 w-64 rounded-lg border bg-background p-1 shadow-lg">
            {ENTITY_TYPES.map((et) => (
              <button
                key={et.value}
                onClick={() => { setSelectedEntity(et.value); setEntityDropdownOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  selectedEntity === et.value ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                }`}
              >
                <Badge variant="secondary" className="text-[10px]">{et.module}</Badge>
                {et.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Field Wizard */}
      {showWizard && (
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Field</CardTitle>
            <CardDescription>
              Step {['name', 'type', 'configure', 'settings'].indexOf(wizardStep) + 1} of 4
              — Adding to <strong>{selectedEntityInfo?.label}</strong>
            </CardDescription>
            {/* Step indicators */}
            <div className="flex gap-1 pt-2">
              {(['name', 'type', 'configure', 'settings'] as WizardStep[]).map((step, i) => (
                <div key={step} className={`h-1 flex-1 rounded-full ${
                  ['name', 'type', 'configure', 'settings'].indexOf(wizardStep) >= i
                    ? 'bg-primary' : 'bg-muted'
                }`} />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {wizardStep === 'name' && (
              <>
                <div>
                  <Label>Field Label</Label>
                  <Input
                    placeholder="e.g. Region, Priority Score, Contract End Date..."
                    value={fieldLabel}
                    onChange={(e) => {
                      setFieldLabel(e.target.value);
                      if (!fieldKey) setFieldKey(generateKey(e.target.value));
                    }}
                    autoFocus
                  />
                </div>
                <div>
                  <Label>Machine Key</Label>
                  <Input
                    placeholder="auto_generated_key"
                    value={fieldKey || generateKey(fieldLabel)}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Used in the API and filters. Auto-generated from the label.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetWizard}>Cancel</Button>
                  <Button onClick={() => setWizardStep('type')} disabled={!fieldLabel.trim()}>Next</Button>
                </div>
              </>
            )}

            {wizardStep === 'type' && (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  {FIELD_TYPES.map((ft) => {
                    const Icon = ft.icon;
                    return (
                      <button
                        key={ft.value}
                        onClick={() => setFieldType(ft.value)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          fieldType === ft.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{ft.label}</div>
                          <div className="text-xs text-muted-foreground">{ft.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep('name')}>Back</Button>
                  <Button onClick={() => setWizardStep('configure')}>Next</Button>
                </div>
              </>
            )}

            {wizardStep === 'configure' && (
              <>
                {needsOptions ? (
                  <div className="space-y-3">
                    <Label>Choices</Label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 rounded-md border px-3 py-1.5 text-sm">{opt.label}</span>
                        <button onClick={() => removeOption(idx)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a choice..."
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addOption()}
                      />
                      <Button variant="outline" onClick={addOption} disabled={!newOptionLabel.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-6 text-center text-sm text-muted-foreground">
                    No extra configuration needed for <strong>{FIELD_TYPES.find((t) => t.value === fieldType)?.label}</strong> fields.
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep('type')}>Back</Button>
                  <Button
                    onClick={() => setWizardStep('settings')}
                    disabled={needsOptions && options.length === 0}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {wizardStep === 'settings' && (
              <>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      checked={isRequired}
                      onChange={(e) => setIsRequired(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-medium">Required</div>
                      <div className="text-xs text-muted-foreground">Users must fill in this field when creating or editing.</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      checked={isFilterable}
                      onChange={(e) => setIsFilterable(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <div>
                      <div className="text-sm font-medium">Filterable</div>
                      <div className="text-xs text-muted-foreground">Allow filtering lists by this field.</div>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Preview</p>
                  <div className="space-y-1.5">
                    <Label>
                      {fieldLabel}{isRequired && <span className="text-destructive"> *</span>}
                    </Label>
                    {fieldType === 'text' && <Input placeholder={`Enter ${fieldLabel.toLowerCase()}...`} disabled />}
                    {fieldType === 'number' && <Input type="number" placeholder="0" disabled />}
                    {fieldType === 'date' && <Input type="date" disabled />}
                    {fieldType === 'email' && <Input type="email" placeholder="name@example.com" disabled />}
                    {fieldType === 'url' && <Input type="url" placeholder="https://..." disabled />}
                    {fieldType === 'currency' && <Input type="number" placeholder="0.00" disabled />}
                    {fieldType === 'boolean' && (
                      <div className="flex h-6 w-11 items-center rounded-full bg-muted px-1">
                        <div className="h-4 w-4 rounded-full bg-white" />
                      </div>
                    )}
                    {(fieldType === 'select' || fieldType === 'multiselect') && (
                      <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                        {options.length ? options.map((o) => o.label).join(', ') : 'No options defined'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep('configure')}>Back</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Field'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active fields list */}
      <div className="space-y-2">
        {activeFields.length === 0 && !showWizard && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Type className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No custom fields yet</p>
              <p className="text-sm text-muted-foreground">
                Add custom data fields to <strong>{selectedEntityInfo?.label}</strong> to capture the data your business needs.
              </p>
              <Button className="mt-4" onClick={() => setShowWizard(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Field
              </Button>
            </CardContent>
          </Card>
        )}

        {activeFields.map((field) => (
          <div key={field.id} className="flex items-center gap-3 rounded-lg border p-3">
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
              {(() => {
                const Icon = FIELD_TYPES.find((t) => t.value === field.fieldType)?.icon || Type;
                return <Icon className="h-4 w-4" />;
              })()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{field.fieldLabel}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{field.fieldKey}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label}
                </Badge>
                {field.isRequired && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                {field.isFilterable && <Badge variant="secondary" className="text-[10px]">Filterable</Badge>}
              </div>
            </div>

            {editingField?.id === field.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingField.fieldLabel}
                  onChange={(e) => setEditingField({ ...editingField, fieldLabel: e.target.value })}
                  className="h-8 w-40"
                />
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({
                    id: field.id,
                    body: { fieldLabel: editingField.fieldLabel, isRequired: editingField.isRequired, isFilterable: editingField.isFilterable },
                  })}
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button onClick={() => setEditingField(field)} className="rounded-md p-1.5 hover:bg-muted">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(field.id)}
                  className="rounded-md p-1.5 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Inactive fields */}
      {inactiveFields.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Deactivated Fields</h3>
          <div className="space-y-2 opacity-60">
            {inactiveFields.map((field) => (
              <div key={field.id} className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  {(() => {
                    const Icon = FIELD_TYPES.find((t) => t.value === field.fieldType)?.icon || Type;
                    return <Icon className="h-4 w-4" />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{field.fieldLabel}</div>
                  <span className="font-mono text-xs text-muted-foreground">{field.fieldKey}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ id: field.id, body: { isActive: true } })}
                >
                  Reactivate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
