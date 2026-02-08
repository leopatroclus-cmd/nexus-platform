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
      <p className="text-xs font-semibold uppercase text-muted-foreground">Custom Fields</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {activeFields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label>
              {field.fieldLabel}
              {field.isRequired && <span className="text-destructive"> *</span>}
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
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-input hover:bg-muted'
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
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Custom Fields</p>
      <div className="grid gap-3 sm:grid-cols-2">
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
            <div key={field.id}>
              <p className="text-xs text-muted-foreground">{field.fieldLabel}</p>
              <p className="text-sm font-medium">{display}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
