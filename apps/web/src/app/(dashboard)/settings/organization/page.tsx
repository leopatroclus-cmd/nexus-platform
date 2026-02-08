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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organization Settings</h1>
      <Card>
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ name }); }} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={orgData?.slug || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Input value={orgData?.plan || 'free'} disabled />
            </div>
            <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
