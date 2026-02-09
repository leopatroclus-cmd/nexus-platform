'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Plus, Trash2, X } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

interface LineItem {
  inventoryId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxRate: string;
}

const emptyLine = (): LineItem => ({ inventoryId: '', description: '', quantity: '1', unitPrice: '', discountPct: '0', taxRate: '0' });

function calcLineTotal(item: LineItem): number {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discountPct) || 0;
  const tax = parseFloat(item.taxRate) || 0;
  return qty * price * (1 - disc / 100) * (1 + tax / 100);
}

export default function OrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-orders', '/erp/orders');

  const [form, setForm] = useState({ type: 'sales', clientId: '', orderDate: new Date().toISOString().slice(0, 10), discount: '0' });
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()]);

  const { data: clients } = useQuery({
    queryKey: ['erp-clients-list'],
    queryFn: async () => { const { data } = await api.get('/erp/clients?limit=100'); return data.data; },
    enabled: showForm,
  });

  const { data: inventory } = useQuery({
    queryKey: ['erp-inventory-list'],
    queryFn: async () => { const { data } = await api.get('/erp/inventory?limit=100'); return data.data; },
    enabled: showForm,
  });

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    clients?.forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [clients]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/erp/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-orders'] });
      setShowForm(false);
      setForm({ type: 'sales', clientId: '', orderDate: new Date().toISOString().slice(0, 10), discount: '0' });
      setLineItems([emptyLine()]);
    },
  });

  const subtotal = useMemo(() => lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discountPct) || 0;
    return sum + qty * price * (1 - disc / 100);
  }, 0), [lineItems]);

  const taxTotal = useMemo(() => lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    const disc = parseFloat(item.discountPct) || 0;
    const tax = parseFloat(item.taxRate) || 0;
    const base = qty * price * (1 - disc / 100);
    return sum + base * (tax / 100);
  }, 0), [lineItems]);

  const orderDiscount = parseFloat(form.discount) || 0;
  const grandTotal = subtotal + taxTotal - orderDiscount;

  const updateLine = (index: number, field: keyof LineItem, value: string) => {
    setLineItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleInventorySelect = (index: number, inventoryId: string) => {
    const inv = inventory?.find((i: any) => i.id === inventoryId);
    if (inv) {
      setLineItems(prev => prev.map((item, i) => i === index ? {
        ...item,
        inventoryId,
        description: inv.name || inv.description || '',
        unitPrice: String(inv.unitPrice || inv.price || ''),
      } : item));
    } else {
      updateLine(index, 'inventoryId', inventoryId);
    }
  };

  const removeLine = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      type: form.type,
      clientId: form.clientId,
      orderDate: form.orderDate,
      discount: orderDiscount,
      items: lineItems.map(item => ({
        inventoryId: item.inventoryId || null,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
        discountPct: parseFloat(item.discountPct) || 0,
        taxRate: parseFloat(item.taxRate) || 0,
      })),
    });
  };

  const columns = [
    { accessorKey: 'orderNumber', header: 'Order #' },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => (
        <span className="inline-flex items-center rounded-full border border-border/40 bg-secondary/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'clientId',
      header: 'Client',
      cell: ({ row }: any) => row.original.clientId ? clientMap[row.original.clientId] || '\u2014' : '\u2014',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        const styles: Record<string, string> = {
          draft: 'border-border/40 bg-secondary/30 text-muted-foreground',
          confirmed: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
          shipped: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
          delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
          cancelled: 'border-destructive/20 bg-destructive/10 text-destructive',
        };
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status] || styles.draft}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: ({ row }: any) => (
        <span className="font-medium">{formatCurrency(parseFloat(row.original.total || '0'))}</span>
      ),
    },
    {
      accessorKey: 'orderDate',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          {new Date(row.original.orderDate).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const selectClass = "flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Orders</h1>
          <p className="text-muted-foreground mt-1">Sales and purchase orders</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-lg">
          {showForm ? <><X className="mr-2 h-4 w-4" /> Cancel</> : <><Plus className="mr-2 h-4 w-4" /> New Order</>}
        </Button>
      </div>

      {/* Order Creation Form */}
      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Header */}
              <div className="grid gap-5 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                  <select className={selectClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="sales">Sales Order</option>
                    <option value="purchase">Purchase Order</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</Label>
                  <select className={selectClass} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
                    <option value="">Select client...</option>
                    {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Date</Label>
                  <Input type="date" className="h-10 rounded-lg bg-secondary/50" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order Discount</Label>
                  <Input type="number" step="0.01" min="0" className="h-10 rounded-lg bg-secondary/50" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line Items</Label>
                  <Button type="button" variant="outline" size="sm" className="rounded-lg border-border/60" onClick={() => setLineItems(prev => [...prev, emptyLine()])}>
                    <Plus className="mr-1 h-3 w-3" /> Add Line
                  </Button>
                </div>

                <div className="rounded-lg border border-border/40 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary/20 border-b border-border/30">
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">Qty</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Unit Price</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">Disc %</th>
                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">Tax %</th>
                        <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">Total</th>
                        <th className="px-3 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/20 last:border-0">
                          <td className="px-2 py-2">
                            <select
                              className="h-9 w-full rounded border border-input bg-secondary/50 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                              value={item.inventoryId}
                              onChange={(e) => handleInventorySelect(idx, e.target.value)}
                            >
                              <option value="">Manual entry</option>
                              {inventory?.map((inv: any) => <option key={inv.id} value={inv.id}>{inv.name || inv.sku}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <Input className="h-9 rounded bg-secondary/50 text-sm" value={item.description} onChange={(e) => updateLine(idx, 'description', e.target.value)} required />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="0" step="1" className="h-9 rounded bg-secondary/50 text-sm" value={item.quantity} onChange={(e) => updateLine(idx, 'quantity', e.target.value)} required />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="0" step="0.01" className="h-9 rounded bg-secondary/50 text-sm" value={item.unitPrice} onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} required />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="0" max="100" step="0.01" className="h-9 rounded bg-secondary/50 text-sm" value={item.discountPct} onChange={(e) => updateLine(idx, 'discountPct', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" min="0" step="0.01" className="h-9 rounded bg-secondary/50 text-sm" value={item.taxRate} onChange={(e) => updateLine(idx, 'taxRate', e.target.value)} />
                          </td>
                          <td className="px-2 py-2 text-right text-sm font-medium tabular-nums">
                            {formatCurrency(calcLineTotal(item))}
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLine(idx)}
                              disabled={lineItems.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium tabular-nums">{formatCurrency(taxTotal)}</span>
                  </div>
                  {orderDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium tabular-nums text-emerald-400">-{formatCurrency(orderDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/40 pt-2">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                  {createMutation.isPending ? 'Creating...' : 'Create Order'}
                </Button>
                <Button type="button" variant="outline" className="rounded-lg border-border/60" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/orders/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} orders</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border-border/60"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border-border/60"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
