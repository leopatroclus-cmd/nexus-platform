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
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function InventoryPage() {
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
    { accessorKey: 'type', header: 'Type', cell: ({ row }: any) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'unitPrice', header: 'Price', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.unitPrice || '0')) },
    { accessorKey: 'quantityOnHand', header: 'Stock', cell: ({ row }: any) => {
      const qty = row.original.quantityOnHand;
      const reorder = row.original.reorderLevel;
      return <span className={qty <= reorder ? 'text-destructive font-medium' : ''}>{qty <= reorder && <AlertTriangle className="inline h-3 w-3 mr-1" />}{qty}</span>;
    }},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Add Item</Button>
      </div>
      {showForm && (
        <Card><CardHeader><CardTitle>New Item</CardTitle></CardHeader><CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Cost Price</Label><Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Initial Stock</Label><Input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" disabled={createMutation.isPending}>Create</Button></div>
          </form>
        </CardContent></Card>
      )}
      <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <DataTable columns={columns} data={items} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} items</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
