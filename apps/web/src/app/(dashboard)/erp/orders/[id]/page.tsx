'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText } from 'lucide-react';
import { formatCurrency } from '@nexus/utils';

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => { const { data } = await api.get(`/erp/orders/${id}`); return data.data; },
  });

  const convertMutation = useMutation({
    mutationFn: () => api.post(`/erp/orders/${id}/convert-to-invoice`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['erp-invoices'] });
      router.push(`/erp/invoices/${res.data.data.id}`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!order) return <div className="flex items-center justify-center py-20 text-muted-foreground">Order not found</div>;

  const statusStyles: Record<string, string> = {
    draft: 'border-border/40 bg-secondary/30 text-muted-foreground',
    confirmed: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    shipped: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    cancelled: 'border-destructive/20 bg-destructive/10 text-destructive',
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl">{order.orderNumber}</h1>
          <div className="mt-1">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status] || statusStyles.draft}`}>
              {order.status}
            </span>
          </div>
        </div>
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending} className="rounded-lg">
          <FileText className="mr-2 h-4 w-4" /> Convert to Invoice
        </Button>
      </div>

      {/* Line Items */}
      <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="pb-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </th>
                  <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Qty
                  </th>
                  <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Price
                  </th>
                  <th className="pb-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/30 hover:bg-primary/[0.03] transition-colors">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatCurrency(parseFloat(item.unitPrice))}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(parseFloat(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-b border-border/20">
                  <td colSpan={3} className="py-3 text-right text-muted-foreground">Subtotal</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(parseFloat(order.subtotal))}</td>
                </tr>
                <tr className="border-b border-border/20">
                  <td colSpan={3} className="py-3 text-right text-muted-foreground">Tax</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(parseFloat(order.tax))}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="pt-3 pb-1 text-right font-bold text-base">Total</td>
                  <td className="pt-3 pb-1 text-right font-bold text-base">{formatCurrency(parseFloat(order.total))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
