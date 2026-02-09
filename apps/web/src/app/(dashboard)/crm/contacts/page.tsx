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
import { Plus, Search, Users, X } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { CustomFieldsRenderer } from '@/components/custom-fields-renderer';

export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', status: 'active', companyId: '' });
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { items, pagination, search, setSearch, page, setPage, isLoading } = usePaginatedQuery('contacts', '/crm/contacts');

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => { const { data } = await api.get('/crm/companies?limit=100'); return data.data; },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '', status: 'active', companyId: '' });
      setCustomData({});
    },
  });

  const columns = [
    { accessorKey: 'firstName', header: 'Name', cell: ({ row }: any) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone' },
    { accessorKey: 'jobTitle', header: 'Job Title' },
    {
      accessorKey: 'companyId',
      header: 'Company',
      cell: ({ row }: any) => {
        const company = companies?.find((c: any) => c.id === row.original.companyId);
        return company ? company.name : <span className="text-muted-foreground">&mdash;</span>;
      },
    },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => (
      <Badge variant={row.original.status === 'active' ? 'success' : 'secondary'}>{row.original.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your contacts and build lasting relationships.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Contact
            </>
          )}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="gradient-border animate-fade-in overflow-hidden">
          <CardHeader>
            <CardTitle>New Contact</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fill in the details below to add a new contact to your CRM.
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ ...form, companyId: form.companyId || null, customData });
              }}
              className="grid gap-5 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  First Name
                </Label>
                <Input
                  className="h-10 rounded-lg bg-secondary/50 border-input"
                  placeholder="John"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Last Name
                </Label>
                <Input
                  className="h-10 rounded-lg bg-secondary/50 border-input"
                  placeholder="Doe"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  className="h-10 rounded-lg bg-secondary/50 border-input"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </Label>
                <Input
                  className="h-10 rounded-lg bg-secondary/50 border-input"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Job Title
                </Label>
                <Input
                  className="h-10 rounded-lg bg-secondary/50 border-input"
                  placeholder="Software Engineer"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Company
                </Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.companyId}
                  onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                >
                  <option value="">No company</option>
                  {companies?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <CustomFieldsRenderer entityType="crm_contact" values={customData} onChange={setCustomData} />
              </div>
              <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Contact'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search contacts by name, email, or phone..."
            className="h-10 rounded-lg bg-secondary/50 border-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {pagination && (
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:block">
            {pagination.total} contact{pagination.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Table or Empty State */}
      {!isLoading && items.length === 0 ? (
        <Card className="animate-fade-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
              <Users className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <h3 className="font-serif text-lg mb-1">No contacts found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {search
                ? `No contacts match "${search}". Try adjusting your search.`
                : 'Get started by adding your first contact.'}
            </p>
            {!search && (
              <Button className="mt-5 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Add Your First Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="animate-fade-in">
          <DataTable
            columns={columns}
            data={items}
            onRowClick={(row: any) => router.push(`/crm/contacts/${row.id}`)}
          />
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between animate-fade-in">
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{pagination.totalPages}</span>
            <span className="hidden sm:inline">
              {' '}&middot; {pagination.total} total contact{pagination.total !== 1 ? 's' : ''}
            </span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-border/60 hover:bg-secondary/80"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-border/60 hover:bg-secondary/80"
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
