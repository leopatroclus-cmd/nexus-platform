'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OrgSettingsPage() {
  const { org } = useAuthStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState(org?.name || '');

  const { data: orgData } = useQuery({
    queryKey: ['org', org?.id],
    queryFn: async () => { const { data } = await api.get(`/orgs/${org?.id}`); return data.data; },
    enabled: !!org?.id,
  });

  useEffect(() => { if (orgData) setName(orgData.name); }, [orgData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/orgs/${org?.id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org'] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization profile and preferences.</p>
      </div>

      <Card className="rounded-xl border-border/60 transition-colors hover:border-border">
        <CardHeader>
          <CardTitle className="font-serif text-xl">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ name }); }}
            className="space-y-6 max-w-md"
          >
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organization Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 rounded-lg bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Slug
              </Label>
              <Input
                value={orgData?.slug || ''}
                disabled
                className="h-10 rounded-lg bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Plan
              </Label>
              <Input
                value={orgData?.plan || 'free'}
                disabled
                className="h-10 rounded-lg bg-secondary/50"
              />
            </div>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
            >
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
