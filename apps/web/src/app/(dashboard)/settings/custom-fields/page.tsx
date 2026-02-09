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
      const { data } = await api.get(`/custom-fields/${selectedEntity}`);
      return data.data;
    },
    enabled: !!org?.id,
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/custom-fields', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      resetWizard();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.put(`/custom-fields/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-fields'] });
      setEditingField(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/custom-fields/${id}`),
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">
            Add custom data fields to any entity type -- no code needed.
          </p>
        </div>
        <Button
          onClick={() => setShowWizard(true)}
          className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Field
        </Button>
      </div>

      {/* Entity type selector */}
      <div className="relative">
        <button
          onClick={() => setEntityDropdownOpen(!entityDropdownOpen)}
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm font-medium transition-colors hover:border-border"
        >
          <Badge className="border-primary/20 bg-primary/10 text-primary text-[10px]">
            {selectedEntityInfo?.module}
          </Badge>
          {selectedEntityInfo?.label}
          <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground" />
        </button>
        {entityDropdownOpen && (
          <div className="absolute z-10 mt-1.5 w-64 rounded-xl border border-border/60 bg-card p-1.5 shadow-xl">
            {ENTITY_TYPES.map((et) => (
              <button
                key={et.value}
                onClick={() => { setSelectedEntity(et.value); setEntityDropdownOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedEntity === et.value
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <Badge className="border-border/40 bg-secondary/50 text-[10px] text-muted-foreground">
                  {et.module}
                </Badge>
                {et.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Field Wizard */}
      {showWizard && (
        <Card className="rounded-xl border-border/60">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Add Custom Field</CardTitle>
            <CardDescription>
              Step {['name', 'type', 'configure', 'settings'].indexOf(wizardStep) + 1} of 4
              {' '} -- Adding to <strong>{selectedEntityInfo?.label}</strong>
            </CardDescription>
            {/* Step indicators */}
            <div className="flex gap-1.5 pt-3">
              {(['name', 'type', 'configure', 'settings'] as WizardStep[]).map((step, i) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    ['name', 'type', 'configure', 'settings'].indexOf(wizardStep) >= i
                      ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.3)]'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {wizardStep === 'name' && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Field Label
                  </Label>
                  <Input
                    placeholder="e.g. Region, Priority Score, Contract End Date..."
                    value={fieldLabel}
                    onChange={(e) => {
                      setFieldLabel(e.target.value);
                      if (!fieldKey) setFieldKey(generateKey(e.target.value));
                    }}
                    autoFocus
                    className="h-10 rounded-lg bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Machine Key
                  </Label>
                  <Input
                    placeholder="auto_generated_key"
                    value={fieldKey || generateKey(fieldLabel)}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className="h-10 rounded-lg bg-secondary/50 font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used in the API and filters. Auto-generated from the label.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetWizard}>Cancel</Button>
                  <Button
                    onClick={() => setWizardStep('type')}
                    disabled={!fieldLabel.trim()}
                    className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                  >
                    Next
                  </Button>
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
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                          fieldType === ft.value
                            ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.08)]'
                            : 'border-border/60 hover:border-border'
                        }`}
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
                          <Icon className="h-4 w-4 text-muted-foreground" />
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
                  <Button
                    onClick={() => setWizardStep('configure')}
                    className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {wizardStep === 'configure' && (
              <>
                {needsOptions ? (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Choices
                    </Label>
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-sm">
                          {opt.label}
                        </span>
                        <button
                          onClick={() => removeOption(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
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
                        className="h-10 rounded-lg bg-secondary/50"
                      />
                      <Button
                        variant="outline"
                        onClick={addOption}
                        disabled={!newOptionLabel.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
                    No extra configuration needed for{' '}
                    <strong>{FIELD_TYPES.find((t) => t.value === fieldType)?.label}</strong> fields.
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep('type')}>Back</Button>
                  <Button
                    onClick={() => setWizardStep('settings')}
                    disabled={needsOptions && options.length === 0}
                    className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                  >
                    Next
                  </Button>
                </div>
              </>
            )}

            {wizardStep === 'settings' && (
              <>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-border cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRequired}
                      onClick={() => setIsRequired(!isRequired)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isRequired ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isRequired ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="text-sm font-medium">Required</div>
                      <div className="text-xs text-muted-foreground">
                        Users must fill in this field when creating or editing.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-border cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isFilterable}
                      onClick={() => setIsFilterable(!isFilterable)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isFilterable ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isFilterable ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <div className="text-sm font-medium">Filterable</div>
                      <div className="text-xs text-muted-foreground">
                        Allow filtering lists by this field.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                <div className="rounded-xl border border-border/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Preview
                  </p>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {fieldLabel}{isRequired && <span className="text-destructive"> *</span>}
                    </Label>
                    {fieldType === 'text' && (
                      <Input
                        placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
                        disabled
                        className="h-10 rounded-lg bg-secondary/50"
                      />
                    )}
                    {fieldType === 'number' && (
                      <Input type="number" placeholder="0" disabled className="h-10 rounded-lg bg-secondary/50" />
                    )}
                    {fieldType === 'date' && (
                      <Input type="date" disabled className="h-10 rounded-lg bg-secondary/50" />
                    )}
                    {fieldType === 'email' && (
                      <Input type="email" placeholder="name@example.com" disabled className="h-10 rounded-lg bg-secondary/50" />
                    )}
                    {fieldType === 'url' && (
                      <Input type="url" placeholder="https://..." disabled className="h-10 rounded-lg bg-secondary/50" />
                    )}
                    {fieldType === 'currency' && (
                      <Input type="number" placeholder="0.00" disabled className="h-10 rounded-lg bg-secondary/50" />
                    )}
                    {fieldType === 'boolean' && (
                      <div className="flex h-6 w-11 items-center rounded-full bg-muted px-1">
                        <div className="h-4 w-4 rounded-full bg-white" />
                      </div>
                    )}
                    {(fieldType === 'select' || fieldType === 'multiselect') && (
                      <div className="h-10 rounded-lg border border-border/60 bg-secondary/50 px-3.5 flex items-center text-sm text-muted-foreground">
                        {options.length ? options.map((o) => o.label).join(', ') : 'No options defined'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setWizardStep('configure')}>Back</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                  >
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
          <Card className="rounded-xl border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/50 mb-4">
                <Type className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-serif text-lg">No custom fields yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add custom data fields to <strong>{selectedEntityInfo?.label}</strong> to capture the data your business needs.
              </p>
              <Button
                className="mt-5 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                onClick={() => setShowWizard(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Your First Field
              </Button>
            </CardContent>
          </Card>
        )}

        {activeFields.map((field) => (
          <div
            key={field.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:border-border"
          >
            <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
              {(() => {
                const Icon = FIELD_TYPES.find((t) => t.value === field.fieldType)?.icon || Type;
                return <Icon className="h-4 w-4 text-muted-foreground" />;
              })()}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{field.fieldLabel}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs text-muted-foreground">{field.fieldKey}</span>
                <Badge className="border-border/40 bg-secondary/50 text-[10px] text-muted-foreground">
                  {FIELD_TYPES.find((t) => t.value === field.fieldType)?.label}
                </Badge>
                {field.isRequired && (
                  <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px]">
                    Required
                  </Badge>
                )}
                {field.isFilterable && (
                  <Badge className="border-border/40 bg-secondary/50 text-[10px] text-muted-foreground">
                    Filterable
                  </Badge>
                )}
              </div>
            </div>

            {editingField?.id === field.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editingField.fieldLabel}
                  onChange={(e) => setEditingField({ ...editingField, fieldLabel: e.target.value })}
                  className="h-8 w-40 rounded-lg bg-secondary/50"
                />
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate({
                    id: field.id,
                    body: { fieldLabel: editingField.fieldLabel, isRequired: editingField.isRequired, isFilterable: editingField.isFilterable },
                  })}
                  className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingField(field)}
                  className="rounded-lg p-2 hover:bg-secondary/50 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(field.id)}
                  className="rounded-lg p-2 hover:bg-destructive/10 transition-colors"
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Deactivated Fields
          </h3>
          <div className="space-y-2 opacity-50">
            {inactiveFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
                  {(() => {
                    const Icon = FIELD_TYPES.find((t) => t.value === field.fieldType)?.icon || Type;
                    return <Icon className="h-4 w-4 text-muted-foreground" />;
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
