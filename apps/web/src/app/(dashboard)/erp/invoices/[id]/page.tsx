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

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!invoice) return <div className="flex items-center justify-center py-20 text-muted-foreground">Invoice not found</div>;

  const statusStyles: Record<string, string> = {
    draft: 'border-border/40 bg-secondary/30 text-muted-foreground',
    sent: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    paid: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    overdue: 'border-destructive/20 bg-destructive/10 text-destructive',
    cancelled: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl">{invoice.invoiceNumber}</h1>
          <div className="mt-1">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[invoice.status] || statusStyles.draft}`}>
              {invoice.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'draft' && (
            <Button onClick={() => statusMutation.mutate('sent')} className="rounded-lg">
              <Send className="mr-2 h-4 w-4" /> Mark Sent
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button onClick={() => statusMutation.mutate('paid')} className="rounded-lg">
              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-lg border-border/60"
            onClick={() => {
              window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/erp/invoices/${id}/pdf`, '_blank');
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="rounded-xl border-border/60 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:border-border transition-colors">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-2 font-serif text-3xl font-bold">{formatCurrency(parseFloat(invoice.total))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 hover:border-border transition-colors">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="mt-2 font-serif text-3xl font-bold text-emerald-400">{formatCurrency(parseFloat(invoice.amountPaid))}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/60 bg-gradient-to-br from-amber-500/10 to-amber-500/5 hover:border-border transition-colors">
          <CardContent className="pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance Due</p>
            <p className="mt-2 font-serif text-3xl font-bold text-amber-400">{formatCurrency(parseFloat(invoice.balanceDue))}</p>
          </CardContent>
        </Card>
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
                {invoice.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-border/30 hover:bg-primary/[0.03] transition-colors">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="py-3 text-right text-muted-foreground">{formatCurrency(parseFloat(item.unitPrice))}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(parseFloat(item.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
