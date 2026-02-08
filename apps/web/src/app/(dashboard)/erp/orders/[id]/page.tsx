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

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <Badge variant="secondary">{order.status}</Badge>
        </div>
        <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          <FileText className="mr-2 h-4 w-4" /> Convert to Invoice
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="py-2 text-left">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              {order.items?.map((item: any) => (
                <tr key={item.id} className="border-b"><td className="py-2">{item.description}</td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{formatCurrency(parseFloat(item.unitPrice))}</td><td className="py-2 text-right">{formatCurrency(parseFloat(item.lineTotal))}</td></tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="py-2 text-right font-medium">Subtotal</td><td className="py-2 text-right">{formatCurrency(parseFloat(order.subtotal))}</td></tr>
              <tr><td colSpan={3} className="py-2 text-right font-medium">Tax</td><td className="py-2 text-right">{formatCurrency(parseFloat(order.tax))}</td></tr>
              <tr className="font-bold"><td colSpan={3} className="py-2 text-right">Total</td><td className="py-2 text-right">{formatCurrency(parseFloat(order.total))}</td></tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
