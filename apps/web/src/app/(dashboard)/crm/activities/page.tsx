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

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'task', title: '', status: 'pending', priority: 'medium' });

  const { items, pagination, page, setPage } = usePaginatedQuery('activities', '/crm/activities');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/activities', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['activities'] }); setShowForm(false); },
  });

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }: any) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => <Badge variant="secondary">{row.original.status}</Badge> },
    { accessorKey: 'priority', header: 'Priority' },
    { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }: any) => row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activities</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Activity</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>New Activity</CardTitle></CardHeader><CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Type</Label>
              <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="task">Task</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option>
              </select>
            </div>
            <div className="flex items-end"><Button type="submit" disabled={createMutation.isPending}>Create</Button></div>
          </form>
        </CardContent></Card>
      )}
      <DataTable columns={columns} data={items} />
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
