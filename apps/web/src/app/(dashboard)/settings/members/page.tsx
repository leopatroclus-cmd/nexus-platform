'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export default function MembersPage() {
  const { org } = useAuthStore();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');

  const { data: members } = useQuery({
    queryKey: ['members', org?.id],
    queryFn: async () => { const { data } = await api.get(`/orgs/${org?.id}/members`); return data.data; },
    enabled: !!org?.id,
  });

  const { data: rolesList } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => { const { data } = await api.get('/roles'); return data.data; },
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/orgs/${org?.id}/members`, { email, roleId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['members'] }); setEmail(''); },
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/orgs/${org?.id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Members</h1>
      <Card>
        <CardHeader><CardTitle>Invite Member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }} className="flex gap-4">
            <Input placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" required />
            <select className="h-9 rounded-md border bg-transparent px-3 text-sm" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              <option value="">Select role</option>
              {rolesList?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <Button type="submit" disabled={inviteMutation.isPending}><Plus className="mr-2 h-4 w-4" /> Invite</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Current Members ({members?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members?.map((m: any) => (
              <div key={m.userId} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{m.roleName}</Badge>
                  {m.isOwner && <Badge variant="default">Owner</Badge>}
                  {!m.isOwner && <Button variant="ghost" size="icon" onClick={() => removeMutation.mutate(m.userId)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
