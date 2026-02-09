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
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Members</h1>
        <p className="text-muted-foreground mt-1">Manage who has access to your organization.</p>
      </div>

      <Card className="rounded-xl border-border/60 transition-colors hover:border-border">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Invite Member</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(); }}
            className="flex gap-4 items-end"
          >
            <div className="flex-1 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-lg bg-secondary/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </Label>
              <select
                className="h-10 rounded-lg border-input bg-secondary/50 px-3.5 text-sm"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
              >
                <option value="">Select role</option>
                {rolesList?.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={inviteMutation.isPending}
              className="h-10 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
            >
              <Plus className="mr-2 h-4 w-4" /> Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border/60 transition-colors hover:border-border">
        <CardHeader>
          <CardTitle className="font-serif text-xl">
            Current Members
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({members?.length || 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members?.map((m: any) => (
              <div
                key={m.userId}
                className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-colors hover:border-border"
              >
                <div>
                  <p className="font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className="border-border/60 bg-secondary/50 text-xs"
                  >
                    {m.roleName}
                  </Badge>
                  {m.isOwner && (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
                      Owner
                    </Badge>
                  )}
                  {!m.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMutation.mutate(m.userId)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
