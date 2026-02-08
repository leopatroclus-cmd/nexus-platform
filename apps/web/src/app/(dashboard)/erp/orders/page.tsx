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
    { accessorKey: 'type', header: 'Type', cell: ({ row }: any) => <Badge variant="outline">{row.original.type}</Badge> },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => <Badge variant="secondary">{row.original.status}</Badge> },
    { accessorKey: 'total', header: 'Total', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.total || '0')) },
    { accessorKey: 'orderDate', header: 'Date', cell: ({ row }: any) => new Date(row.original.orderDate).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Button onClick={() => router.push('/erp/orders/new')}><Plus className="mr-2 h-4 w-4" /> New Order</Button>
      </div>
      <DataTable columns={columns} data={items} onRowClick={(row: any) => router.push(`/erp/orders/${row.id}`)} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} orders</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
