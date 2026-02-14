'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Trash2, CreditCard, DollarSign, Calendar,
  FileText, Users2, Receipt,
} from 'lucide-react';
import { formatCurrency } from '@nexus/utils';
import Link from 'next/link';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '\u2014';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PaymentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: payment, isLoading } = useQuery({
    queryKey: ['erp-payment', id],
    queryFn: async () => {
      const { data } = await api.get(`/erp/payments/${id}`);
      return data.data;
    },
  });

  const { data: client } = useQuery({
    queryKey: ['erp-client', payment?.clientId],
    queryFn: async () => {
      const { data } = await api.get(`/erp/clients/${payment.clientId}`);
      return data.data;
    },
    enabled: !!payment?.clientId,
  });

  const { data: invoice } = useQuery({
    queryKey: ['erp-invoice', payment?.invoiceId],
    queryFn: async () => {
      const { data } = await api.get(`/erp/invoices/${payment.invoiceId}`);
      return data.data;
    },
    enabled: !!payment?.invoiceId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/erp/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-payments'] });
      router.push('/erp/payments');
    },
  });

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

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <CreditCard className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <h2 className="font-serif text-xl mb-1">Payment not found</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This payment may have been deleted or you may not have access.
        </p>
        <Button variant="outline" onClick={() => router.push('/erp/payments')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Payments
        </Button>
      </div>
    );
  }

  const methodLabels: Record<string, string> = {
    bank_transfer: 'Bank Transfer',
    credit_card: 'Credit Card',
    cash: 'Cash',
    check: 'Check',
    other: 'Other',
  };

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
              <h1 className="font-serif text-3xl">{payment.paymentNumber}</h1>
              <Badge variant="success">{payment.status}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {formatDate(payment.paymentDate)}
            </p>
          </div>
        </div>
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

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Amount</p>
                  <p className="text-lg font-semibold">{formatCurrency(parseFloat(payment.amount || '0'))}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Method</p>
                  <p className="text-sm font-medium">{methodLabels[payment.paymentMethod] || payment.paymentMethod}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Calendar className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Payment Date</p>
                  <p className="text-sm font-medium">{formatDate(payment.paymentDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Receipt className="h-4 w-4 text-violet-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-medium capitalize">{payment.status}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar — Related */}
        <div className="space-y-6">
          {/* Client */}
          <Card className="animate-fade-in" style={{ animationDelay: '160ms' }}>
            <CardHeader>
              <CardTitle className="text-base">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {client ? (
                <Link
                  href={`/erp/clients/${payment.clientId}`}
                  className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Users2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{client.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{client.type}</p>
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>

          {/* Invoice */}
          {payment.invoiceId && (
            <Card className="animate-fade-in" style={{ animationDelay: '240ms' }}>
              <CardHeader>
                <CardTitle className="text-base">Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice ? (
                  <Link
                    href={`/erp/invoices/${payment.invoiceId}`}
                    className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <FileText className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(parseFloat(invoice.total || '0'))}
                      </p>
                    </div>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
