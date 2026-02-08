'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { CustomFieldsRenderer } from '@/components/custom-fields-renderer';

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'customer', currency: 'USD' });
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { items, pagination, search, setSearch, page, setPage } = usePaginatedQuery('erp-clients', '/erp/clients');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/erp/clients', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['erp-clients'] }); setShowForm(false); },
  });

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }: any) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'currency', header: 'Currency' },
    { accessorKey: 'taxId', header: 'Tax ID' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Client</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>New Client</CardTitle></CardHeader><CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, customData }); }} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Type</Label>
              <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="customer">Customer</option><option value="vendor">Vendor</option><option value="both">Both</option>
              </select>
            </div>
            <div className="sm:col-span-3"><CustomFieldsRenderer entityType="erp_client" values={customData} onChange={setCustomData} /></div>
            <div className="flex items-end"><Button type="submit" disabled={createMutation.isPending}>Create</Button></div>
          </form>
        </CardContent></Card>
      )}
      <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <DataTable columns={columns} data={items} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} total</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
