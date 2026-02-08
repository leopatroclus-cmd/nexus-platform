-- Row-Level Security policies for multi-tenant isolation
-- Every org-scoped table gets a policy: USING (org_id = current_setting('app.current_org_id')::uuid)

-- Helper: enable RLS and create policy for a table
-- Note: The app sets `app.current_org_id` via SET LOCAL in the tenant middleware

-- ═══ Core Tables ═══

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roles USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON org_memberships USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE org_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON org_modules USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON custom_field_definitions USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON refresh_tokens USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON audit_log USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE org_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON org_sequences USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ CRM Tables ═══

ALTER TABLE crm_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_companies USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_contacts USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE crm_deal_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_deal_stages USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_deals USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_activities USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON crm_notes USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ ERP Tables ═══

ALTER TABLE erp_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_clients USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_inventory USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_orders USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_invoices USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_payments USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_ledger_entries USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE erp_chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON erp_chart_of_accounts USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ Agent Tables ═══

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agents USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE agent_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agent_actions_log USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ Chat Tables ═══

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ Email Tables ═══

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON email_accounts USING (org_id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON emails USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- ═══ Bypass for superuser / app role ═══
-- The 'nexus' role is the app owner and bypasses RLS by default (superuser or table owner).
-- For production, create a restricted role for the app connection and grant BYPASSRLS only to the migration role.

-- Tables WITHOUT RLS (global or join tables without org_id):
-- organizations, users, permissions, role_permissions, agent_permissions, agent_tools,
-- conversation_participants, erp_order_items, erp_invoice_items, email_attachments
