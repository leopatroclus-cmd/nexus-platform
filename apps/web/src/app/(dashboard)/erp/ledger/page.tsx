'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { formatCurrency } from '@nexus/utils';

export default function LedgerPage() {
  const { items } = usePaginatedQuery('erp-ledger', '/erp/ledger');

  const { data: balances } = useQuery({
    queryKey: ['ledger-balances'],
    queryFn: async () => { const { data } = await api.get('/erp/ledger/balances'); return data.data; },
  });

  const columns = [
    { accessorKey: 'entryDate', header: 'Date', cell: ({ row }: any) => new Date(row.original.entryDate).toLocaleDateString() },
    { accessorKey: 'accountCode', header: 'Account' },
    { accessorKey: 'entryType', header: 'Type', cell: ({ row }: any) => <Badge variant={row.original.entryType === 'debit' ? 'default' : 'secondary'}>{row.original.entryType}</Badge> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }: any) => formatCurrency(parseFloat(row.original.amount)) },
    { accessorKey: 'description', header: 'Description' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">General Ledger</h1>
      {balances && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(balances as Record<string, any>).map(([code, bal]: [string, any]) => (
            <Card key={code}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{code}</p>
                <p className="text-lg font-bold">{formatCurrency(bal.balance)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <DataTable columns={columns} data={items} />
    </div>
  );
}
