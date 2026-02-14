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
import { Plus, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function InventoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ sku: '', name: '', type: 'product', unit: 'unit', unitPrice: '', costPrice: '', taxRate: '0', quantityOnHand: '0', reorderLevel: '0' });

  const { items, pagination, search, setSearch, page, setPage } = usePaginatedQuery('erp-inventory', '/erp/inventory');

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/erp/inventory', { ...data, unitPrice: parseFloat(data.unitPrice), costPrice: parseFloat(data.costPrice), taxRate: parseFloat(data.taxRate), quantityOnHand: parseInt(data.quantityOnHand), reorderLevel: parseInt(data.reorderLevel) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['erp-inventory'] }); setShowForm(false); },
  });

  const columns = [
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'name', header: 'Name' },
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
      accessorKey: 'unitPrice',
      header: 'Price',
      cell: ({ row }: any) => (
        <span className="font-medium">{formatCurrency(parseFloat(row.original.unitPrice || '0'))}</span>
      ),
    },
    {
      accessorKey: 'quantityOnHand',
      header: 'Stock',
      cell: ({ row }: any) => {
        const qty = row.original.quantityOnHand;
        const reorder = row.original.reorderLevel;
        const isLow = qty <= reorder;
        return (
          <span className={isLow ? 'inline-flex items-center gap-1 text-destructive font-medium' : ''}>
            {isLow && <AlertTriangle className="h-3 w-3" />}
            {qty}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Inventory</h1>
          <p className="text-muted-foreground mt-1">Track products, services, and stock levels</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="rounded-lg">
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
              className="grid gap-6 sm:grid-cols-3"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU
                </Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cost Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Initial Stock
                </Label>
                <Input
                  type="number"
                  value={form.quantityOnHand}
                  onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })}
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={createMutation.isPending} className="rounded-lg">
                  {createMutation.isPending ? 'Creating...' : 'Create Item'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Input
        placeholder="Search inventory..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm h-10 rounded-lg bg-secondary/50"
      />

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/inventory/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} items</span>
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
