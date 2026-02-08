'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function PaymentsPage() {
  const { items, pagination, page, setPage } = usePaginatedQuery('erp-payments', '/erp/payments');

  const columns = [
    { accessorKey: 'paymentNumber', header: 'Payment #' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.amount || '0')) },
    { accessorKey: 'paymentMethod', header: 'Method' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => <Badge variant="success">{row.original.status}</Badge> },
    { accessorKey: 'paymentDate', header: 'Date', cell: ({ row }: any) => new Date(row.original.paymentDate).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <DataTable columns={columns} data={items} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} payments</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
