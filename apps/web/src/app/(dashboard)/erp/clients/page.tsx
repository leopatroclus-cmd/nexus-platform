'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { CustomFieldsRenderer } from '@/components/custom-fields-renderer';

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'customer', currency: 'USD', pricelistId: '' });
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { items, pagination, search, setSearch, page, setPage } = usePaginatedQuery('erp-clients', '/erp/clients');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/erp/clients', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['erp-clients'] }); setShowForm(false); },
  });

  const { data: crmCompanies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => { const { data } = await api.get('/crm/companies?limit=100'); return data.data; },
    enabled: showConvert,
  });

  const convertMutation = useMutation({
    mutationFn: (crmCompanyId: string) => api.post('/erp/clients/convert-from-crm', { crmCompanyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-clients'] });
      setShowConvert(false);
    },
  });

  const { data: pricelists } = useQuery({
    queryKey: ['erp-pricelists-list'],
    queryFn: async () => { const { data } = await api.get('/erp/pricelists?limit=100'); return data.data; },
  });

  const pricelistMap = useMemo(() => {
    const map: Record<string, string> = {};
    pricelists?.forEach((p: any) => { map[p.id] = p.name; });
    return map;
  }, [pricelists]);

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => (
        <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {row.original.type}
        </span>
      ),
    },
    { accessorKey: 'currency', header: 'Currency' },
    {
      accessorKey: 'pricelistId',
      header: 'Pricelist',
      cell: ({ row }: any) => row.original.pricelistId ? pricelistMap[row.original.pricelistId] || '\u2014' : '\u2014',
    },
    { accessorKey: 'taxId', header: 'Tax ID' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your customers and vendors</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { setShowConvert(!showConvert); setShowForm(false); }}
            className="rounded-lg border-border/60"
          >
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Convert from CRM
          </Button>
          <Button onClick={() => { setShowForm(!showForm); setShowConvert(false); }} className="rounded-lg">
            <Plus className="mr-2 h-4 w-4" /> Add Client
          </Button>
        </div>
      </div>

      {/* Convert from CRM */}
      {showConvert && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Convert CRM Company to Client</CardTitle>
            <p className="text-sm text-muted-foreground">Select a CRM company to convert into an ERP client.</p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {crmCompanies?.map((company: any) => (
                <button
                  key={company.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3.5 text-left hover:border-border hover:bg-secondary/40 transition-colors"
                  onClick={() => convertMutation.mutate(company.id)}
                  disabled={convertMutation.isPending}
                >
                  <div>
                    <p className="text-sm font-medium">{company.name}</p>
                    {company.industry && <p className="text-xs text-muted-foreground mt-0.5">{company.industry}</p>}
                  </div>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
              {crmCompanies?.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2 py-4 text-center">No CRM companies found.</p>
              )}
            </div>
            {convertMutation.isPending && (
              <p className="text-sm text-muted-foreground mt-3">Converting...</p>
            )}
            <div className="mt-4">
              <Button variant="outline" className="border-border/60" onClick={() => setShowConvert(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, pricelistId: form.pricelistId || null, customData }); }}
              className="grid gap-6 sm:grid-cols-3"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pricelist
                </Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.pricelistId}
                  onChange={(e) => setForm({ ...form, pricelistId: e.target.value })}
                >
                  <option value="">Default pricing</option>
                  {pricelists?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <CustomFieldsRenderer entityType="erp_client" values={customData} onChange={setCustomData} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                  {createMutation.isPending ? 'Creating...' : 'Create Client'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Input
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm h-10 rounded-lg bg-secondary/50"
      />

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/clients/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} total</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border-border/60"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border-border/60"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
