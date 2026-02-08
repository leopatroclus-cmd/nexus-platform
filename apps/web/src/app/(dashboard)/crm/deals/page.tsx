'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@nexus/utils';

export default function DealsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const { data: stages } = useQuery({
    queryKey: ['deal-stages'],
    queryFn: async () => { const { data } = await api.get('/crm/deal-stages'); return data.data; },
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => { const { data } = await api.get('/crm/deals?limit=100'); return data.data; },
  });

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      api.put(`/crm/deals/${dealId}/stage`, { stageId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });

  const deals = dealsData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deals</h1>
        <div className="flex gap-2">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>List</Button>
          <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Deal</Button>
        </div>
      </div>

      {showForm && <DealForm stages={stages} onClose={() => setShowForm(false)} />}

      {view === 'kanban' && stages && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage: any) => {
            const stageDeals = deals.filter((d: any) => d.stageId === stage.id);
            const totalValue = stageDeals.reduce((sum: number, d: any) => sum + parseFloat(d.value || '0'), 0);
            return (
              <div key={stage.id} className="min-w-[280px] flex-shrink-0">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{stage.name}</h3>
                    <Badge variant="secondary">{stageDeals.length}</Badge>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
                  <div className="space-y-2">
                    {stageDeals.map((deal: any) => (
                      <Card key={deal.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm font-medium">{deal.title}</p>
                          {deal.value && <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(deal.value))}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div
                    className="mt-2 h-12 rounded border-2 border-dashed border-muted-foreground/20"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const dealId = e.dataTransfer.getData('dealId');
                      if (dealId) moveMutation.mutate({ dealId, stageId: stage.id });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="rounded-md border">
          <table className="w-full">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Value</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Stage</th>
            </tr></thead>
            <tbody>
              {deals.map((deal: any) => {
                const stage = stages?.find((s: any) => s.id === deal.stageId);
                return (
                  <tr key={deal.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{deal.title}</td>
                    <td className="px-4 py-3 text-sm">{deal.value ? formatCurrency(parseFloat(deal.value)) : '—'}</td>
                    <td className="px-4 py-3 text-sm"><Badge variant="outline">{stage?.name || '—'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DealForm({ stages, onClose }: { stages: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', value: '', stageId: stages?.[0]?.id || '', currency: 'USD' });

  const mutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/deals', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deals'] }); onClose(); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>New Deal</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, value: parseFloat(form.value) || undefined }); }} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={form.stageId} onChange={(e) => setForm({ ...form, stageId: e.target.value })}>
              {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={mutation.isPending}>Create Deal</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
