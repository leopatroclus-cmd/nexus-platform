'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { CustomFieldsRenderer } from '@/components/custom-fields-renderer';

export default function CompaniesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', domain: '', industry: '', email: '', phone: '' });
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { items, pagination, search, setSearch, page, setPage } = usePaginatedQuery('companies', '/crm/companies');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/companies', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['companies'] }); setShowForm(false); },
  });

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'domain', header: 'Domain' },
    { accessorKey: 'industry', header: 'Industry' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Companies</h1>
          <p className="text-muted-foreground mt-1">Manage your company directory</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Company
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Company</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, customData }); }} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <CustomFieldsRenderer entityType="crm_company" values={customData} onChange={setCustomData} />
              </div>
              <div className="flex items-end gap-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Company'}
                </Button>
                <Button type="button" variant="outline" className="border-border bg-transparent hover:bg-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search companies..."
          className="h-10 rounded-lg bg-secondary/50 pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/crm/companies/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-transparent hover:bg-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-border bg-transparent hover:bg-secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
