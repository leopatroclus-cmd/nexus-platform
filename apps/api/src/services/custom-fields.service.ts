import { eq, and, asc } from 'drizzle-orm';
import { customFieldDefinitions } from '@nexus/database';
import { db } from '../lib/db.js';
import { NotFoundError } from '../lib/errors.js';
import type { CustomFieldType } from '@nexus/types';

function generateFieldSchema(fieldType: CustomFieldType, options?: any[]) {
  const schemas: Record<string, Record<string, unknown>> = {
    text: { type: 'string' },
    number: { type: 'number' },
    currency: { type: 'number' },
    date: { type: 'string', format: 'date' },
    boolean: { type: 'boolean' },
    email: { type: 'string', format: 'email' },
    url: { type: 'string', format: 'uri' },
    select: { type: 'string', enum: options?.map(o => o.value) || [] },
    multiselect: { type: 'array', items: { type: 'string', enum: options?.map(o => o.value) || [] } },
  };
  return schemas[fieldType] || { type: 'string' };
}

export async function list(orgId: string, entityType: string) {
  return db.select().from(customFieldDefinitions)
    .where(and(eq(customFieldDefinitions.orgId, orgId), eq(customFieldDefinitions.entityType, entityType)))
    .orderBy(asc(customFieldDefinitions.displayOrder));
}

export async function create(orgId: string, data: {
  entityType: string; fieldKey: string; fieldLabel: string; fieldType: CustomFieldType;
  options?: any[]; isRequired?: boolean; isFilterable?: boolean; displayOrder?: number; defaultValue?: unknown;
}) {
  const fieldSchema = generateFieldSchema(data.fieldType, data.options);
  const [field] = await db.insert(customFieldDefinitions).values({
    orgId, entityType: data.entityType, fieldKey: data.fieldKey, fieldLabel: data.fieldLabel,
    fieldType: data.fieldType, fieldSchema, options: data.options,
    isRequired: data.isRequired ?? false, isFilterable: data.isFilterable ?? false,
    displayOrder: data.displayOrder ?? 0, defaultValue: data.defaultValue,
  }).returning();
  return field;
}

export async function update(orgId: string, fieldId: string, data: {
  fieldLabel?: string; options?: any[]; isRequired?: boolean; isFilterable?: boolean;
  isActive?: boolean; displayOrder?: number; defaultValue?: unknown;
}) {
  const [existing] = await db.select().from(customFieldDefinitions)
    .where(and(eq(customFieldDefinitions.id, fieldId), eq(customFieldDefinitions.orgId, orgId))).limit(1);
  if (!existing) throw new NotFoundError('Custom field definition');

  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.options) {
    updateData.fieldSchema = generateFieldSchema(existing.fieldType as CustomFieldType, data.options);
  }

  const [field] = await db.update(customFieldDefinitions).set(updateData)
    .where(eq(customFieldDefinitions.id, fieldId)).returning();
  return field;
}

export async function remove(orgId: string, fieldId: string) {
  const [existing] = await db.select().from(customFieldDefinitions)
    .where(and(eq(customFieldDefinitions.id, fieldId), eq(customFieldDefinitions.orgId, orgId))).limit(1);
  if (!existing) throw new NotFoundError('Custom field definition');

  const [field] = await db.update(customFieldDefinitions).set({ isActive: false, updatedAt: new Date() })
    .where(eq(customFieldDefinitions.id, fieldId)).returning();
  return field;
}

export async function reorder(orgId: string, entityType: string, fieldIds: string[]) {
  for (let i = 0; i < fieldIds.length; i++) {
    await db.update(customFieldDefinitions).set({ displayOrder: i, updatedAt: new Date() })
      .where(and(eq(customFieldDefinitions.id, fieldIds[i]), eq(customFieldDefinitions.orgId, orgId)));
  }
}
