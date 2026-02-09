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
    {
      accessorKey: 'entryDate',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-muted-foreground">
          {new Date(row.original.entryDate).toLocaleDateString()}
        </span>
      ),
    },
    { accessorKey: 'accountCode', header: 'Account' },
    {
      accessorKey: 'entryType',
      header: 'Type',
      cell: ({ row }: any) => {
        const isDebit = row.original.entryType === 'debit';
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
            isDebit
              ? 'border-blue-500/20 bg-blue-500/10 text-blue-400'
              : 'border-violet-500/20 bg-violet-500/10 text-violet-400'
          }`}>
            {row.original.entryType}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }: any) => (
        <span className="font-medium">{formatCurrency(parseFloat(row.original.amount))}</span>
      ),
    },
    { accessorKey: 'description', header: 'Description' },
  ];

  // Gradient colors to cycle through for balance cards
  const gradientColors = [
    'from-blue-500/10 to-blue-500/5',
    'from-emerald-500/10 to-emerald-500/5',
    'from-violet-500/10 to-violet-500/5',
    'from-amber-500/10 to-amber-500/5',
    'from-rose-500/10 to-rose-500/5',
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl">General Ledger</h1>
        <p className="text-muted-foreground mt-1">Account balances and journal entries</p>
      </div>

      {/* Balance Summary Cards */}
      {balances && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(balances as Record<string, any>).map(([code, bal]: [string, any], index: number) => (
            <Card
              key={code}
              className={`rounded-xl border-border/60 bg-gradient-to-br ${gradientColors[index % gradientColors.length]} hover:border-border transition-colors`}
            >
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{code}</p>
                <p className="mt-1.5 text-lg font-bold">{formatCurrency(bal.balance)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-xl border border-border/60">
        <DataTable columns={columns} data={items} />
      </div>
    </div>
  );
}
