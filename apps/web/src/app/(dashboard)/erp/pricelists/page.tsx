'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Plus, Trash2, ArrowLeft, X } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

interface PricelistItem {
  inventoryId: string;
  price: string;
  minQuantity: string;
}

const emptyItem = (): PricelistItem => ({ inventoryId: '', price: '', minQuantity: '1' });

export default function PricelistsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', currency: 'USD', isActive: true });
  const [priceItems, setPriceItems] = useState<PricelistItem[]>([emptyItem()]);

  const { items, pagination, search, setSearch, page, setPage } = usePaginatedQuery('erp-pricelists', '/erp/pricelists');

  const { data: inventory } = useQuery({
    queryKey: ['erp-inventory-list'],
    queryFn: async () => { const { data } = await api.get('/erp/inventory?limit=100'); return data.data; },
    enabled: showForm || !!editId,
  });

  const { data: editData } = useQuery({
    queryKey: ['erp-pricelist', editId],
    queryFn: async () => { const { data } = await api.get(`/erp/pricelists/${editId}`); return data.data; },
    enabled: !!editId,
  });

  useEffect(() => {
    if (editData) {
      setForm({ name: editData.name, description: editData.description || '', currency: editData.currency, isActive: editData.isActive });
      if (editData.items?.length > 0) {
        setPriceItems(editData.items.map((i: any) => ({
          inventoryId: i.inventoryId,
          price: String(i.price),
          minQuantity: String(i.minQuantity),
        })));
      } else {
        setPriceItems([emptyItem()]);
      }
    }
  }, [editData]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/erp/pricelists', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-pricelists'] });
      setShowForm(false);
      setForm({ name: '', description: '', currency: 'USD', isActive: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/erp/pricelists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-pricelists'] });
      queryClient.invalidateQueries({ queryKey: ['erp-pricelist', editId] });
      setEditId(null);
      setForm({ name: '', description: '', currency: 'USD', isActive: true });
      setPriceItems([emptyItem()]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/erp/pricelists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-pricelists'] });
      setEditId(null);
    },
  });

  const updateItem = (index: number, field: keyof PricelistItem, value: string) => {
    setPriceItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const removeItem = (index: number) => {
    if (priceItems.length <= 1) return;
    setPriceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = priceItems.filter(i => i.inventoryId && i.price);
    if (editId) {
      updateMutation.mutate({ id: editId, data: { ...form, items: validItems } });
    } else {
      createMutation.mutate(form);
    }
  };

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description', cell: ({ row }: any) => <span className="text-muted-foreground">{row.original.description || '\u2014'}</span> },
    { accessorKey: 'itemCount', header: 'Items', cell: ({ row }: any) => <span>{row.original.itemCount ?? 0}</span> },
    { accessorKey: 'currency', header: 'Currency' },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }: any) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${row.original.isActive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-border/40 bg-secondary/30 text-muted-foreground'}`}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  const selectClass = "flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring";

  // ─── Detail / Edit View ───
  if (editId) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => { setEditId(null); setPriceItems([emptyItem()]); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-serif text-3xl">Edit Pricelist</h1>
            <p className="text-muted-foreground mt-1">Update pricing details and items</p>
          </div>
        </div>

        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Pricelist Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                  <Input className="h-10 rounded-lg bg-secondary/50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <Input className="h-10 rounded-lg bg-secondary/50" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                  <Input className="h-10 rounded-lg bg-secondary/50" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <select className={selectClass} value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price Items</Label>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg border-border/60" onClick={() => setPriceItems(prev => [...prev, emptyItem()])}>
                    <Plus className="mr-1 h-3 w-3" /> Add Item
                  </Button>
                </div>
                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary/20 border-b border-border/30">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Inventory Item</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-36">Custom Price</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Default Price</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Min Qty</th>
                        <th className="px-3 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {priceItems.map((item, idx) => {
                        const inv = inventory?.find((i: any) => i.id === item.inventoryId);
                        return (
                          <tr key={idx} className="border-b border-border/20 last:border-0">
                            <td className="px-2 py-2">
                              <select
                                className="h-9 w-full rounded border border-input bg-secondary/50 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                value={item.inventoryId}
                                onChange={(e) => updateItem(idx, 'inventoryId', e.target.value)}
                              >
                                <option value="">Select item...</option>
                                {inventory?.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.name} ({inv.sku})</option>)}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min="0" step="0.01" className="h-9 rounded bg-secondary/50 text-sm" value={item.price} onChange={(e) => updateItem(idx, 'price', e.target.value)} required />
                            </td>
                            <td className="px-2 py-2 text-sm text-muted-foreground">
                              {inv ? formatCurrency(parseFloat(inv.unitPrice || '0')) : '\u2014'}
                            </td>
                            <td className="px-2 py-2">
                              <Input type="number" min="1" step="1" className="h-9 rounded bg-secondary/50 text-sm" value={item.minQuantity} onChange={(e) => updateItem(idx, 'minQuantity', e.target.value)} />
                            </td>
                            <td className="px-2 py-2">
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)} disabled={priceItems.length <= 1}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-lg">
                  {updateMutation.isPending ? 'Saving...' : 'Save Pricelist'}
                </Button>
                <Button type="button" variant="outline" className="rounded-lg border-border/60" onClick={() => { setEditId(null); setPriceItems([emptyItem()]); }}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border-destructive/40 text-destructive hover:bg-destructive/10 ml-auto"
                  onClick={() => { if (confirm('Delete this pricelist?')) deleteMutation.mutate(editId); }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Pricelists</h1>
          <p className="text-muted-foreground mt-1">Custom pricing for clients</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-lg">
          {showForm ? <><X className="mr-2 h-4 w-4" /> Cancel</> : <><Plus className="mr-2 h-4 w-4" /> Add Pricelist</>}
        </Button>
      </div>

      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Pricelist</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Currency</Label>
                <Input className="h-10 rounded-lg bg-secondary/50" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                  {createMutation.isPending ? 'Creating...' : 'Create Pricelist'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Input placeholder="Search pricelists..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm h-10 rounded-lg bg-secondary/50" />

      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => setEditId(row.id)} />
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} pricelists</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border-border/60">Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border-border/60">Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
