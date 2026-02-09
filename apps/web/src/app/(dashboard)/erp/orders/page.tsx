'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Plus } from 'lucide-react';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function OrdersPage() {
  const router = useRouter();
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-orders', '/erp/orders');

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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Orders</h1>
          <p className="text-muted-foreground mt-1">Sales and purchase orders</p>
        </div>
        <Button onClick={() => router.push('/erp/orders/new')} className="rounded-lg">
          <Plus className="mr-2 h-4 w-4" /> New Order
        </Button>
      </div>

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
