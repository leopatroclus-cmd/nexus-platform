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
    { accessorKey: 'direction', header: '', cell: ({ row }: any) => row.original.direction === 'inbound' ? <Inbox className="h-4 w-4 text-blue-500" /> : <Send className="h-4 w-4 text-green-500" /> },
    { accessorKey: 'fromAddress', header: 'From' },
    { accessorKey: 'subject', header: 'Subject' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }: any) => <Badge variant="outline">{row.original.status}</Badge> },
    { accessorKey: 'createdAt', header: 'Date', cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email</h1>
      </div>
      {accounts && accounts.length > 0 ? (
        <div className="flex gap-2">
          {accounts.map((acc: any) => (
            <Badge key={acc.id} variant="outline"><Mail className="mr-1 h-3 w-3" />{acc.emailAddress}</Badge>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Mail className="mx-auto mb-2 h-8 w-8" />
          <p>No email accounts connected. Go to Settings to add one.</p>
        </CardContent></Card>
      )}
      <DataTable columns={columns} data={items} />
      {pagination && <div className="flex justify-between text-sm text-muted-foreground"><span>{pagination.total} emails</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(page-1)}>Prev</Button><Button variant="outline" size="sm" disabled={page>=pagination.totalPages} onClick={()=>setPage(page+1)}>Next</Button></div></div>}
    </div>
  );
}
