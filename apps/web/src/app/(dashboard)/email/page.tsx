'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { Mail, Inbox, Send } from 'lucide-react';

export default function EmailPage() {
  const { items, pagination, page, setPage } = usePaginatedQuery('emails', '/email/emails');

  const { data: accounts } = useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => { try { const { data } = await api.get('/email/accounts'); return data.data; } catch { return []; } },
  });

  const columns = [
    {
      accessorKey: 'direction',
      header: '',
      cell: ({ row }: any) =>
        row.original.direction === 'inbound' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
            <Inbox className="h-4 w-4 text-blue-400" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Send className="h-4 w-4 text-emerald-400" />
          </div>
        ),
    },
    { accessorKey: 'fromAddress', header: 'From' },
    { accessorKey: 'subject', header: 'Subject' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => (
        <Badge className="border-border/40 bg-secondary/50 text-xs text-muted-foreground">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Email</h1>
          <p className="text-muted-foreground mt-1">View and manage your connected email accounts.</p>
        </div>
      </div>

      {accounts && accounts.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {accounts.map((acc: any) => (
            <Badge
              key={acc.id}
              className="border-border/60 bg-secondary/50 text-sm text-foreground px-3 py-1.5 rounded-lg"
            >
              <Mail className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              {acc.emailAddress}
            </Badge>
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border-border/60">
          <CardContent className="py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/50 mx-auto mb-4">
              <Mail className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-serif text-lg">No email accounts connected</p>
            <p className="text-sm text-muted-foreground mt-1">Go to Settings to add one.</p>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl border-border/60">
        <CardContent className="p-0">
          <DataTable columns={columns} data={items} />
        </CardContent>
      </Card>

      {pagination && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {pagination.total} emails
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg"
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
