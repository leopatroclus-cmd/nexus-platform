'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, ChevronRight, Check } from 'lucide-react';

interface Permission {
  id: string;
  code: string;
  module: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: Permission[];
}

export default function RolesPage() {
  const { org } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles', org?.id],
    queryFn: async () => { const { data } = await api.get('/api/roles'); return data.data; },
    enabled: !!org?.id,
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => { const { data } = await api.get('/api/roles/permissions'); return data.data; },
    enabled: !!org?.id,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/api/roles', { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setNewRoleName('');
      setShowCreate(false);
    },
  });

  const updatePermsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      api.put(`/api/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  });

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const selectedPermIds = new Set(selectedRole?.permissions?.map((p) => p.id) || []);

  const permsByModule = (allPermissions || []).reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.module] = acc[p.module] || []).push(p);
    return acc;
  }, {});

  const togglePermission = (permId: string) => {
    if (!selectedRole || selectedRole.isSystem) return;
    const current = new Set(selectedPermIds);
    if (current.has(permId)) current.delete(permId);
    else current.add(permId);
    updatePermsMutation.mutate({ roleId: selectedRole.id, permissionIds: Array.from(current) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Manage roles and their permissions for your organization.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Role
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Input
              placeholder="Role name..."
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newRoleName.trim() && createMutation.mutate(newRoleName.trim())}
            />
            <Button onClick={() => newRoleName.trim() && createMutation.mutate(newRoleName.trim())} disabled={createMutation.isPending}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Role list */}
        <div className="space-y-2">
          {roles?.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedRoleId === role.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
              }`}
            >
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-muted-foreground">
                  {role.permissions?.length || 0} permissions
                </div>
              </div>
              {role.isSystem && <Badge variant="secondary">System</Badge>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Permissions editor */}
        {selectedRole ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedRole.name}
                {selectedRole.isSystem && (
                  <Badge variant="secondary">System Role</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedRole.isSystem && (
                <p className="text-sm text-muted-foreground">
                  System roles have pre-configured permissions that cannot be modified.
                </p>
              )}
              {Object.entries(permsByModule).map(([mod, perms]) => (
                <div key={mod}>
                  <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">{mod}</h3>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {perms.map((perm) => {
                      const isActive = selectedPermIds.has(perm.id);
                      return (
                        <button
                          key={perm.id}
                          onClick={() => togglePermission(perm.id)}
                          disabled={selectedRole.isSystem}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                            isActive ? 'border-primary/30 bg-primary/5' : 'border-transparent hover:bg-muted/50'
                          } ${selectedRole.isSystem ? 'cursor-default' : 'cursor-pointer'}`}
                        >
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isActive ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isActive && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="font-mono text-xs">{perm.resource}:{perm.action}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
              Select a role to view and manage its permissions.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
