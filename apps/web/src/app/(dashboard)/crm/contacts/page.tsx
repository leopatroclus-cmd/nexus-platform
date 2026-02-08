'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { CustomFieldsRenderer } from '@/components/custom-fields-renderer';

export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', status: 'active' });
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { items, pagination, search, setSearch, page, setPage, isLoading } = usePaginatedQuery('contacts', '/crm/contacts');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/crm/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', status: 'active' });
      setCustomData({});
    },
  });

  const columns = [
    { accessorKey: 'firstName', header: 'Name', cell: ({ row }: any) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'jobTitle', header: 'Job Title' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Add Contact
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Contact</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, customData }); }} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <CustomFieldsRenderer entityType="crm_contact" values={customData} onChange={setCustomData} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Contact'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/crm/contacts/${row.id}`)} />

      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pagination.total} total contacts</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
