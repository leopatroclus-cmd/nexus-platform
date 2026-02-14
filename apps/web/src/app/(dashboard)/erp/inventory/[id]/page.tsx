'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomFieldsDisplay, CustomFieldsRenderer } from '@/components/custom-fields-renderer';
import {
  ArrowLeft, Trash2, Pencil, X, Save, Package,
  DollarSign, Hash, Layers, AlertTriangle, BarChart3,
} from 'lucide-react';
import { formatCurrency } from '@nexus/utils';

export default function InventoryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [customData, setCustomData] = useState<Record<string, unknown>>({});

  const { data: item, isLoading } = useQuery({
    queryKey: ['erp-inventory-item', id],
    queryFn: async () => {
      const { data } = await api.get(`/erp/inventory/${id}`);
      return data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/erp/inventory/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-inventory-item', id] });
      queryClient.invalidateQueries({ queryKey: ['erp-inventory'] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/erp/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-inventory'] });
      router.push('/erp/inventory');
    },
  });

  function startEditing() {
    if (!item) return;
    setForm({
      name: item.name || '',
      sku: item.sku || '',
      type: item.type || 'product',
      unit: item.unit || 'unit',
      unitPrice: item.unitPrice || '',
      costPrice: item.costPrice || '',
      taxRate: item.taxRate || '0',
      quantityOnHand: item.quantityOnHand ?? 0,
      reorderLevel: item.reorderLevel ?? 0,
    });
    setCustomData(item.customData || {});
    setEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      unitPrice: parseFloat(form.unitPrice) || 0,
      costPrice: parseFloat(form.costPrice) || 0,
      taxRate: parseFloat(form.taxRate) || 0,
      quantityOnHand: parseInt(form.quantityOnHand) || 0,
      reorderLevel: parseInt(form.reorderLevel) || 0,
      customData,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg shimmer" />
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg shimmer" />
            <div className="h-5 w-24 rounded shimmer" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-64 rounded-xl shimmer" />
          <div className="h-48 rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Package className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <h2 className="font-serif text-xl mb-1">Item not found</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This item may have been deleted or you may not have access.
        </p>
        <Button variant="outline" onClick={() => router.push('/erp/inventory')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  const isLowStock = item.quantityOnHand <= item.reorderLevel;
  const margin = item.unitPrice > 0 ? ((item.unitPrice - item.costPrice) / item.unitPrice * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" className="mt-1 rounded-lg hover:bg-secondary/80" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl">{item.name}</h1>
              <Badge variant="secondary">{item.type}</Badge>
              {isLowStock && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> Low Stock
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" className="rounded-lg" onClick={startEditing}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Edit Form */}
      {editing && (
        <Card className="rounded-xl border-primary/20 bg-primary/[0.02]">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Edit Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Unit Price</Label>
                <Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} required className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Price</Label>
                <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tax Rate %</Label>
                <Input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity On Hand</Label>
                <Input type="number" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reorder Level</Label>
                <Input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
              </div>
              <div className="sm:col-span-3">
                <CustomFieldsRenderer entityType="erp_inventory" values={customData} onChange={setCustomData} />
              </div>
              <div className="flex gap-2 sm:col-span-3">
                <Button type="submit" disabled={updateMutation.isPending} className="rounded-lg">
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" className="rounded-lg" onClick={() => setEditing(false)}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Hash className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">SKU</p>
                  <p className="text-sm font-medium font-mono">{item.sku}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Layers className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unit</p>
                  <p className="text-sm font-medium">{item.unit}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Unit Price</p>
                  <p className="text-sm font-medium">{formatCurrency(parseFloat(item.unitPrice || '0'))}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <DollarSign className="h-4 w-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cost Price</p>
                  <p className="text-sm font-medium">{formatCurrency(parseFloat(item.costPrice || '0'))}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10">
                  <BarChart3 className="h-4 w-4 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tax Rate</p>
                  <p className="text-sm font-medium">{item.taxRate}%</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '350ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Margin</p>
                  <p className="text-sm font-medium">{margin}%</p>
                </div>
              </div>
            </div>

            {item.customData && Object.keys(item.customData).length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
                <CustomFieldsDisplay entityType="erp_inventory" values={item.customData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Card */}
        <div className="space-y-6">
          <Card className="animate-fade-in" style={{ animationDelay: '160ms' }}>
            <CardHeader>
              <CardTitle className="text-base">Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">On Hand</span>
                <span className={`text-lg font-semibold tabular-nums ${isLowStock ? 'text-destructive' : ''}`}>
                  {isLowStock && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                  {item.quantityOnHand}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reorder Level</span>
                <span className="text-sm font-medium tabular-nums">{item.reorderLevel}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/30 pt-3">
                <span className="text-sm text-muted-foreground">Stock Value</span>
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(item.quantityOnHand * parseFloat(item.costPrice || '0'))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
