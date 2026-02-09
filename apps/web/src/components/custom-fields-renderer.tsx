'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FieldOption {
  value: string;
  label: string;
}

interface FieldDef {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options?: FieldOption[];
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
}

interface CustomFieldsRendererProps {
  entityType: string;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function CustomFieldsRenderer({ entityType, values, onChange, disabled }: CustomFieldsRendererProps) {
  const { data: fields } = useQuery<FieldDef[]>({
    queryKey: ['custom-fields', entityType],
    queryFn: async () => {
      const { data } = await api.get(`/api/custom-fields/${entityType}`);
      return data.data;
    },
  });

  const activeFields = (fields || []).filter((f) => f.isActive).sort((a, b) => a.displayOrder - b.displayOrder);

  if (activeFields.length === 0) return null;

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/40" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Custom Fields</p>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {activeFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {renderField(field, values[field.fieldKey], (v) => setValue(field.fieldKey, v), disabled)}
          </div>
        ))}
      </div>
    </div>
  );
}

function renderField(
  field: FieldDef,
  value: unknown,
  onChange: (v: unknown) => void,
  disabled?: boolean,
) {
  switch (field.fieldType) {
    case 'text':
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${field.fieldLabel.toLowerCase()}...`}
          required={field.isRequired}
          disabled={disabled}
        />
      );

    case 'number':
    case 'currency':
      return (
        <Input
          type="number"
          step={field.fieldType === 'currency' ? '0.01' : 'any'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="0"
          required={field.isRequired}
          disabled={disabled}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.isRequired}
          disabled={disabled}
          className="[color-scheme:dark]"
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="name@example.com"
          required={field.isRequired}
          disabled={disabled}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          required={field.isRequired}
          disabled={disabled}
        />
      );

    case 'boolean':
      return (
        <button
          type="button"
          onClick={() => !disabled && onChange(!value)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ${
            value ? 'bg-primary shadow-[0_0_10px_hsl(238_83%_67%/0.3)]' : 'bg-secondary'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      );

    case 'select':
      return (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          required={field.isRequired}
          disabled={disabled}
          className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50"
        >
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(field.options || []).map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (isSelected) onChange(selected.filter((v) => v !== opt.value));
                  else onChange([...selected, opt.value]);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-primary/30 bg-primary/10 text-primary shadow-[0_0_8px_hsl(238_83%_67%/0.15)]'
                    : 'border-border/60 hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      );
    }

    default:
      return (
        <Input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

// Read-only display component for detail pages
export function CustomFieldsDisplay({ entityType, values }: { entityType: string; values: Record<string, unknown> }) {
  const { data: fields } = useQuery<FieldDef[]>({
    queryKey: ['custom-fields', entityType],
    queryFn: async () => {
      const { data } = await api.get(`/api/custom-fields/${entityType}`);
      return data.data;
    },
  });

  const activeFields = (fields || []).filter((f) => f.isActive).sort((a, b) => a.displayOrder - b.displayOrder);
  const fieldsWithValues = activeFields.filter((f) => values[f.fieldKey] != null && values[f.fieldKey] !== '');

  if (fieldsWithValues.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/40" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Custom Fields</p>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fieldsWithValues.map((field) => {
          const val = values[field.fieldKey];
          let display: string;
          if (field.fieldType === 'boolean') display = val ? 'Yes' : 'No';
          else if (field.fieldType === 'multiselect' && Array.isArray(val)) {
            const labels = (field.options || []).filter((o) => (val as string[]).includes(o.value)).map((o) => o.label);
            display = labels.join(', ');
          } else if (field.fieldType === 'select') {
            display = (field.options || []).find((o) => o.value === val)?.label || String(val);
          } else if (field.fieldType === 'currency') {
            display = `$${Number(val).toFixed(2)}`;
          } else {
            display = String(val);
          }
          return (
            <div key={field.id} className="rounded-lg bg-secondary/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{field.fieldLabel}</p>
              <p className="text-sm font-medium">{display}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
