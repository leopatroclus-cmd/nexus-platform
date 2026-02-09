'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users, ShoppingCart, Bot, MessageSquare, Mail } from 'lucide-react';

const moduleInfo: Record<string, { name: string; description: string; icon: any }> = {
  core: { name: 'Core', description: 'Auth, orgs, users, roles (always enabled)', icon: Package },
  crm: { name: 'CRM', description: 'Contacts, companies, deals, activities', icon: Users },
  erp: { name: 'ERP', description: 'Clients, inventory, orders, invoices, accounting', icon: ShoppingCart },
  agents: { name: 'AI Agents', description: 'AI agent management, API keys, approval workflows', icon: Bot },
  chat: { name: 'Chat', description: 'Conversations, real-time messaging', icon: MessageSquare },
  email: { name: 'Email', description: 'Email sync, parsing, sending', icon: Mail },
};

export default function ModulesPage() {
  const { org } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: modules } = useQuery({
    queryKey: ['org-modules', org?.id],
    queryFn: async () => { const { data } = await api.get(`/orgs/${org?.id}/modules`); return data.data; },
    enabled: !!org?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) =>
      api.put(`/orgs/${org?.id}/modules/${moduleKey}`, { isEnabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['org-modules'] }),
  });

  const allModules = Object.keys(moduleInfo);
  const enabledMap = new Map(modules?.map((m: any) => [m.moduleKey, m.isEnabled]) || []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl">Modules</h1>
        <p className="text-muted-foreground mt-1">Enable or disable modules for your organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {allModules.map((key) => {
          const info = moduleInfo[key];
          const isEnabled = key === 'core' ? true : (enabledMap.get(key) ?? false);
          const Icon = info.icon;
          return (
            <Card
              key={key}
              className={`rounded-xl border-border/60 transition-all hover:border-border ${
                isEnabled ? '' : 'opacity-50'
              }`}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="font-serif text-base">{info.name}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{info.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {key === 'core' ? (
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs">
                    Always Enabled
                  </Badge>
                ) : (
                  <button
                    onClick={() => toggleMutation.mutate({ moduleKey: key, isEnabled: !isEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-primary shadow-[0_0_12px_rgba(var(--primary),0.3)]' : 'bg-muted'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
