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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Company</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Company</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, customData }); }} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Domain</Label><Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} /></div>
              <div className="space-y-2"><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="sm:col-span-2"><CustomFieldsRenderer entityType="crm_company" values={customData} onChange={setCustomData} /></div>
              <div className="flex items-end"><Button type="submit" disabled={createMutation.isPending}>Create</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search companies..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/crm/companies/${row.id}`)} />
      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
