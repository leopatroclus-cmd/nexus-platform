'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function PaymentsPage() {
  const router = useRouter();
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-payments', '/erp/payments');

  const columns = [
    { accessorKey: 'paymentNumber', header: 'Payment #' },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }: any) => (
        <span className="font-medium">{formatCurrency(parseFloat(row.original.amount || '0'))}</span>
      ),
    },
    { accessorKey: 'paymentMethod', header: 'Method' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'paymentDate',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          {new Date(row.original.paymentDate).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl">Payments</h1>
        <p className="text-muted-foreground mt-1">Payment records and transaction history</p>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/payments/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} payments</span>
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
