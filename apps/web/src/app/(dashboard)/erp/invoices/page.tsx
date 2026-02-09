'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

const statusColors: Record<string, string> = { draft: 'secondary', sent: 'default', paid: 'success', overdue: 'destructive', cancelled: 'outline' };

const statusStyles: Record<string, string> = {
  draft: 'border-border/40 bg-secondary/30 text-muted-foreground',
  sent: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  paid: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  overdue: 'border-destructive/20 bg-destructive/10 text-destructive',
  cancelled: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
};

export default function InvoicesPage() {
  const router = useRouter();
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-invoices', '/erp/invoices');

  const columns = [
    { accessorKey: 'invoiceNumber', header: 'Invoice #' },
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
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || statusStyles.draft}`}>
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
      accessorKey: 'balanceDue',
      header: 'Balance Due',
      cell: ({ row }: any) => {
        const balance = parseFloat(row.original.balanceDue || '0');
        return (
          <span className={balance > 0 ? 'font-medium text-amber-400' : 'text-muted-foreground'}>
            {formatCurrency(balance)}
          </span>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          {new Date(row.original.dueDate).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Invoices</h1>
          <p className="text-muted-foreground mt-1">Track billing and payment status</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/invoices/${row.id}`)} />
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{pagination.total} invoices</span>
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
