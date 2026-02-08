'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, CheckCircle, Download } from 'lucide-react';
import { formatCurrency } from '@nexus/utils';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => { const { data } = await api.get(`/erp/invoices/${id}`); return data.data; },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/erp/invoices/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoice', id] }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>{invoice.status}</Badge>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && <Button onClick={() => statusMutation.mutate('sent')}><Send className="mr-2 h-4 w-4" /> Mark Sent</Button>}
          {invoice.status === 'sent' && <Button onClick={() => statusMutation.mutate('paid')}><CheckCircle className="mr-2 h-4 w-4" /> Mark Paid</Button>}
          <Button variant="outline" onClick={() => {
            window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/erp/invoices/${id}/pdf`, '_blank');
          }}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{formatCurrency(parseFloat(invoice.total))}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Paid</p><p className="text-2xl font-bold text-green-600">{formatCurrency(parseFloat(invoice.amountPaid))}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Balance Due</p><p className="text-2xl font-bold text-amber-600">{formatCurrency(parseFloat(invoice.balanceDue))}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="py-2 text-left">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              {invoice.items?.map((item: any) => (
                <tr key={item.id} className="border-b"><td className="py-2">{item.description}</td><td className="py-2 text-right">{item.quantity}</td><td className="py-2 text-right">{formatCurrency(parseFloat(item.unitPrice))}</td><td className="py-2 text-right">{formatCurrency(parseFloat(item.lineTotal))}</td></tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
