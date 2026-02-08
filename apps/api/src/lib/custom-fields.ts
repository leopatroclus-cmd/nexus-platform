import Ajv from 'ajv';
import { eq, and } from 'drizzle-orm';
import { customFieldDefinitions } from '@nexus/database';
import type { Database } from '@nexus/database';
import type { CustomFieldType } from '@nexus/types';

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

function fieldTypeToJsonSchema(fieldType: CustomFieldType, options?: any[]): Record<string, unknown> {
  switch (fieldType) {
    case 'text':
      return { type: 'string' };
    case 'number':
    case 'currency':
      return { type: 'number' };
    case 'date':
      return { type: 'string', format: 'date' };
    case 'boolean':
      return { type: 'boolean' };
    case 'email':
      return { type: 'string', format: 'email' };
    case 'url':
      return { type: 'string', format: 'uri' };
    case 'select':
      return {
        type: 'string',
        enum: options?.map(o => o.value) || [],
      };
    case 'multiselect':
      return {
        type: 'array',
        items: { type: 'string', enum: options?.map(o => o.value) || [] },
      };
    default:
      return { type: 'string' };
  }
}

export async function buildCustomFieldSchema(
  db: Database,
  orgId: string,
  entityType: string,
): Promise<Record<string, unknown>> {
  const definitions = await db
    .select()
    .from(customFieldDefinitions)
    .where(
      and(
        eq(customFieldDefinitions.orgId, orgId),
        eq(customFieldDefinitions.entityType, entityType),
        eq(customFieldDefinitions.isActive, true),
      ),
    );

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const def of definitions) {
    properties[def.fieldKey] = fieldTypeToJsonSchema(
      def.fieldType as CustomFieldType,
      def.options as any[],
    );
    if (def.isRequired) {
      required.push(def.fieldKey);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  };
}

export async function validateCustomData(
  db: Database,
  orgId: string,
  entityType: string,
  data: Record<string, unknown>,
): Promise<{ valid: boolean; errors?: string[] }> {
  const schema = await buildCustomFieldSchema(db, orgId, entityType);

  if (Object.keys(schema.properties as Record<string, unknown>).length === 0) {
    return { valid: true };
  }

  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`) || [];
    return { valid: false, errors };
  }

  return { valid: true };
}
