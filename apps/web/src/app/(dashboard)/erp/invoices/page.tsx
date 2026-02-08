'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

const statusColors: Record<string, string> = { draft: 'secondary', sent: 'default', paid: 'success', overdue: 'destructive', cancelled: 'outline' };

export default function InvoicesPage() {
  const router = useRouter();
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-invoices', '/erp/invoices');

  const columns = [
    { accessorKey: 'invoiceNumber', header: 'Invoice #' },
    { accessorKey: 'type', header: 'Type', cell: ({ row }: any) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => <Badge variant={statusColors[row.original.status] as any || 'secondary'}>{row.original.status}</Badge> },
    { accessorKey: 'total', header: 'Total', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.total || '0')) },
    { accessorKey: 'balanceDue', header: 'Balance Due', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.balanceDue || '0')) },
    { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }: any) => new Date(row.original.dueDate).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
      </div>
      <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/invoices/${row.id}`)} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} invoices</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
