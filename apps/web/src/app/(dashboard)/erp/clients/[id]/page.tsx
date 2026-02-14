'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomFieldsDisplay, CustomFieldsRenderer } from '@/components/custom-fields-renderer';
import {
  ArrowLeft, Trash2, Pencil, X, Save, Users2, Building2,
  CreditCard, DollarSign, FileText, Receipt, MapPin,
} from 'lucide-react';
import Link from 'next/link';

function formatCurrency(val: string | number | null | undefined) {
  const n = Number(val);
  if (!val || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAddress(addr: any) {
  if (!addr) return null;
  if (typeof addr === 'string') return addr;
  const parts = [addr.line1, addr.line2, [addr.city, addr.state, addr.zip].filter(Boolean).join(', '), addr.country].filter(Boolean);
  return parts.join('\n');
}

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { data: client, isLoading } = useQuery({
    queryKey: ['erp-client', id],
    queryFn: async () => {
      const { data } = await api.get(`/erp/clients/${id}`);
      return data.data;
    },
  });

  const { data: pricelists } = useQuery({
    queryKey: ['erp-pricelists-list'],
    queryFn: async () => {
      const { data } = await api.get('/erp/pricelists?limit=100');
      return data.data;
    },
  });

  const { data: crmCompany } = useQuery({
    queryKey: ['crm-company', client?.crmCompanyId],
    queryFn: async () => {
      const { data } = await api.get(`/crm/companies/${client.crmCompanyId}`);
      return data.data;
    },
    enabled: !!client?.crmCompanyId,
  });

  const { data: invoices } = useQuery({
    queryKey: ['erp-client-invoices', id],
    queryFn: async () => {
      const { data } = await api.get(`/erp/invoices?clientId=${id}&limit=5`);
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/erp/clients/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-client', id] });
      queryClient.invalidateQueries({ queryKey: ['erp-clients'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/erp/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-clients'] });
      router.push('/erp/clients');
    },
  });

  function startEditing() {
    if (!client) return;
    setForm({
      name: client.name || '',
      type: client.type || 'customer',
      taxId: client.taxId || '',
      currency: client.currency || 'USD',
      paymentTerms: client.paymentTerms || '',
      creditLimit: client.creditLimit || '',
      pricelistId: client.pricelistId || '',
    });
    setCustomData(client.customData || {});
    setEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      creditLimit: form.creditLimit || null,
      pricelistId: form.pricelistId || null,
      customData,
    });
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg shimmer" />
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg shimmer" />
            <div className="h-5 w-24 rounded shimmer" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-64 rounded-xl shimmer" />
          <div className="h-48 rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  // Not found
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Users2 className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <h2 className="font-serif text-xl mb-1">Client not found</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This client may have been deleted or you may not have access.
        </p>
        <Button variant="outline" onClick={() => router.push('/erp/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const pricelist = pricelists?.find((p: any) => p.id === client.pricelistId);
  const billingAddr = formatAddress(client.billingAddress);
  const shippingAddr = formatAddress(client.shippingAddress);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 rounded-lg hover:bg-secondary/80"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl">{client.name}</h1>
              <Badge variant="secondary">{client.type}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Created {formatDate(client.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" className="rounded-lg" onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="rounded-xl border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Edit Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax ID</Label>
                <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Terms</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                  <option value="">None</option>
                  <option value="due_on_receipt">Due on Receipt</option>
                  <option value="net_15">Net 15</option>
                  <option value="net_30">Net 30</option>
                  <option value="net_45">Net 45</option>
                  <option value="net_60">Net 60</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Limit</Label>
                <Input type="number" step="0.01" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="h-10 rounded-lg bg-secondary/50" placeholder="No limit" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pricelist</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring" value={form.pricelistId} onChange={(e) => setForm({ ...form, pricelistId: e.target.value })}>
                  <option value="">Default pricing</option>
                  {pricelists?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <CustomFieldsRenderer entityType="erp_client" values={customData} onChange={setCustomData} />
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-lg">
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tax ID</p>
                  <p className="text-sm font-medium truncate">{client.taxId || <span className="text-muted-foreground/60 font-normal">Not provided</span>}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Currency</p>
                  <p className="text-sm font-medium">{client.currency}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <CreditCard className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Payment Terms</p>
                  <p className="text-sm font-medium">{client.paymentTerms?.replace(/_/g, ' ') || <span className="text-muted-foreground/60 font-normal">Not set</span>}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <CreditCard className="h-4 w-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Credit Limit</p>
                  <p className="text-sm font-medium">{client.creditLimit ? formatCurrency(client.creditLimit) : <span className="text-muted-foreground/60 font-normal">No limit</span>}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
                  <Receipt className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pricelist</p>
                  <p className="text-sm font-medium">{pricelist?.name || <span className="text-muted-foreground/60 font-normal">Default pricing</span>}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '350ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                  <DollarSign className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Opening Balance</p>
                  <p className="text-sm font-medium">{formatCurrency(client.openingBalance)}</p>
                  {client.openingBalanceDate && <p className="text-xs text-muted-foreground mt-0.5">as of {formatDate(client.openingBalanceDate)}</p>}
                </div>
              </div>
            </div>

            {/* Addresses */}
            {(billingAddr || shippingAddr) && (
              <div className="grid gap-5 sm:grid-cols-2">
                {billingAddr && (
                  <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                      <MapPin className="h-4 w-4 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Billing Address</p>
                      <p className="text-sm font-medium whitespace-pre-line">{billingAddr}</p>
                    </div>
                  </div>
                )}
                {shippingAddr && (
                  <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 animate-fade-in" style={{ animationDelay: '450ms' }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10">
                      <MapPin className="h-4 w-4 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Shipping Address</p>
                      <p className="text-sm font-medium whitespace-pre-line">{shippingAddr}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CRM Link */}
            {crmCompany && (
              <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked CRM Company</p>
                </div>
                <Link
                  href={`/crm/companies/${client.crmCompanyId}`}
                  className="text-sm font-medium text-blue-400 hover:underline"
                >
                  {crmCompany.name}
                </Link>
              </div>
            )}

            {/* Custom Fields */}
            {client.customData && Object.keys(client.customData).length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
                <CustomFieldsDisplay entityType="erp_client" values={client.customData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar — Recent Invoices */}
        <div className="space-y-6">
          <Card className="animate-fade-in" style={{ animationDelay: '160ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Recent Invoices</CardTitle>
              <Badge variant="secondary" className="font-sans text-2xs">
                {invoices?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {invoices?.length ? (
                <div className="space-y-0">
                  {invoices.map((inv: any, i: number) => (
                    <Link
                      key={inv.id}
                      href={`/erp/invoices`}
                      className="border-b border-border/30 py-3 first:pt-0 last:border-0 last:pb-0 animate-fade-in flex items-center justify-between hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors"
                      style={{ animationDelay: `${(i + 1) * 60}ms` }}
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inv.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(inv.total)}</p>
                        <Badge
                          variant={inv.status === 'paid' ? 'success' : inv.status === 'issued' ? 'default' : 'secondary'}
                          className="mt-0.5"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No invoices yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Invoices for this client will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
