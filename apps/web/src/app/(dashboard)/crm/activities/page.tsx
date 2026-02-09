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
import { Plus } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';

const typeColors: Record<string, string> = {
  task: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  call: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  email: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  meeting: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
};

const statusColors: Record<string, string> = {
  pending: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  cancelled: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
  in_progress: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
};

const priorityColors: Record<string, string> = {
  low: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
  medium: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  high: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  urgent: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
};

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'task', title: '', status: 'pending', priority: 'medium', relatedType: '', relatedId: '', dueDate: '' });

  const { items, pagination, page, setPage } = usePaginatedQuery('activities', '/crm/activities');

  const { data: contactsList } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: async () => { const { data } = await api.get('/crm/contacts?limit=100'); return data.data; },
  });

  const { data: companiesList } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => { const { data } = await api.get('/crm/companies?limit=100'); return data.data; },
  });

  const { data: dealsList } = useQuery({
    queryKey: ['deals-list'],
    queryFn: async () => { const { data } = await api.get('/crm/deals?limit=100'); return data.data; },
  });

  const entityOptions = useMemo(() => {
    if (form.relatedType === 'crm_contact') return contactsList?.map((c: any) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` })) || [];
    if (form.relatedType === 'crm_company') return companiesList?.map((c: any) => ({ id: c.id, label: c.name })) || [];
    if (form.relatedType === 'crm_deal') return dealsList?.map((d: any) => ({ id: d.id, label: d.title })) || [];
    return [];
  }, [form.relatedType, contactsList, companiesList, dealsList]);

  const entityNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    contactsList?.forEach((c: any) => { map[c.id] = `${c.firstName} ${c.lastName}`; });
    companiesList?.forEach((c: any) => { map[c.id] = c.name; });
    dealsList?.forEach((d: any) => { map[d.id] = d.title; });
    return map;
  }, [contactsList, companiesList, dealsList]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/activities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      setShowForm(false);
      setForm({ type: 'task', title: '', status: 'pending', priority: 'medium', relatedType: '', relatedId: '', dueDate: '' });
    },
  });

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => (
        <Badge className={typeColors[row.original.type] || 'border-border/60 bg-secondary/50 text-muted-foreground'}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge className={statusColors[row.original.status] || 'border-border/60 bg-secondary/50 text-muted-foreground'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }: any) => (
        <Badge className={priorityColors[row.original.priority] || 'border-border/60 bg-secondary/50 text-muted-foreground'}>
          {row.original.priority}
        </Badge>
      ),
    },
    {
      accessorKey: 'relatedId',
      header: 'Related To',
      cell: ({ row }: any) => {
        const name = row.original.relatedId ? entityNameMap[row.original.relatedId] : null;
        if (!name) return <span className="text-muted-foreground">&mdash;</span>;
        const typeLabel = row.original.relatedType?.replace('crm_', '') || '';
        return (
          <span className="text-sm">
            <span className="text-muted-foreground capitalize">{typeLabel}:</span> {name}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }: any) => row.original.dueDate
        ? new Date(row.original.dueDate).toLocaleDateString()
        : '\u2014',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Activities</h1>
          <p className="text-muted-foreground mt-1">Track tasks, calls, emails, and meetings</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Activity
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({
                ...form,
                relatedType: form.relatedType || null,
                relatedId: form.relatedId || null,
                dueDate: form.dueDate || null,
              });
            }} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="task">Task</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</Label>
                <Input
                  type="date"
                  className="h-10 rounded-lg bg-secondary/50"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related Entity Type</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.relatedType}
                  onChange={(e) => setForm({ ...form, relatedType: e.target.value, relatedId: '' })}
                >
                  <option value="">None</option>
                  <option value="crm_contact">Contact</option>
                  <option value="crm_company">Company</option>
                  <option value="crm_deal">Deal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related Entity</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  value={form.relatedId}
                  onChange={(e) => setForm({ ...form, relatedId: e.target.value })}
                  disabled={!form.relatedType}
                >
                  <option value="">{form.relatedType ? 'Select...' : 'Choose type first'}</option>
                  {entityOptions.map((e: any) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 flex items-end gap-3">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Activity'}
                </Button>
                <Button type="button" variant="outline" className="border-border bg-transparent hover:bg-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} />
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
