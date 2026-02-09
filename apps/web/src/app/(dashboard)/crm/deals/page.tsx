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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Deals</h1>
          <p className="text-muted-foreground mt-1">Track and manage your sales pipeline</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'kanban' ? 'default' : 'outline'}
            size="sm"
            className={view === 'kanban'
              ? 'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
              : 'border-border bg-transparent hover:bg-secondary'
            }
            onClick={() => setView('kanban')}
          >
            Kanban
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            className={view === 'list'
              ? 'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
              : 'border-border bg-transparent hover:bg-secondary'
            }
            onClick={() => setView('list')}
          >
            List
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Deal
          </Button>
        </div>
      </div>

      {/* Deal Form */}
      {showForm && <DealForm stages={stages} onClose={() => setShowForm(false)} />}

      {/* Kanban View */}
      {view === 'kanban' && stages && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage: any) => {
            const stageDeals = deals.filter((d: any) => d.stageId === stage.id);
            const totalValue = stageDeals.reduce((sum: number, d: any) => sum + parseFloat(d.value || '0'), 0);
            return (
              <div key={stage.id} className="min-w-[300px] flex-shrink-0">
                <div className="rounded-xl bg-secondary/20 border border-border/30 p-3.5">
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{stage.name}</h3>
                    <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-400 text-[11px]">
                      {stageDeals.length}
                    </Badge>
                  </div>
                  <p className="mb-4 text-sm font-medium text-emerald-400">{formatCurrency(totalValue)}</p>

                  {/* Deal Cards */}
                  <div className="space-y-2.5">
                    {stageDeals.map((deal: any) => (
                      <Card
                        key={deal.id}
                        className="cursor-pointer rounded-xl border-border/60 hover:border-border hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] transition-all duration-200"
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('dealId', deal.id)}
                      >
                        <CardContent className="p-3.5">
                          <p className="text-sm font-medium">{deal.title}</p>
                          {deal.value && (
                            <p className="text-sm text-muted-foreground mt-1">{formatCurrency(parseFloat(deal.value))}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Drop Zone */}
                  <div
                    className="mt-3 h-12 rounded-lg border-2 border-dashed border-border/30 hover:border-border/60 transition-colors"
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

      {/* List View */}
      {view === 'list' && (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-secondary/20">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Value</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal: any) => {
                const stage = stages?.find((s: any) => s.id === deal.stageId);
                return (
                  <tr key={deal.id} className="border-b border-border/30 hover:bg-primary/[0.03] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{deal.title}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{deal.value ? formatCurrency(parseFloat(deal.value)) : '\u2014'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-400">{stage?.name || '\u2014'}</Badge>
                    </td>
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
    <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
      <CardHeader>
        <CardTitle className="font-serif text-xl">New Deal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ ...form, value: parseFloat(form.value) || undefined }); }} className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input className="h-10 rounded-lg bg-secondary/50" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</Label>
            <Input className="h-10 rounded-lg bg-secondary/50" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</Label>
            <select
              className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.stageId}
              onChange={(e) => setForm({ ...form, stageId: e.target.value })}
            >
              {stages?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-shadow"
            >
              {mutation.isPending ? 'Creating...' : 'Create Deal'}
            </Button>
            <Button type="button" variant="outline" className="border-border bg-transparent hover:bg-secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
