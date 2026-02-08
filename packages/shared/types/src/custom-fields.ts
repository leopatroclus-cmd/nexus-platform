export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'email'
  | 'url'
  | 'currency';

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: string;
  orgId: string;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  fieldSchema: Record<string, unknown>;
  options?: CustomFieldOption[];
  isRequired: boolean;
  isFilterable: boolean;
  isActive: boolean;
  displayOrder: number;
  defaultValue?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldCreateInput {
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: CustomFieldType;
  options?: CustomFieldOption[];
  isRequired?: boolean;
  isFilterable?: boolean;
  displayOrder?: number;
  defaultValue?: unknown;
}

export interface CustomFieldUpdateInput {
  fieldLabel?: string;
  options?: CustomFieldOption[];
  isRequired?: boolean;
  isFilterable?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  defaultValue?: unknown;
}
