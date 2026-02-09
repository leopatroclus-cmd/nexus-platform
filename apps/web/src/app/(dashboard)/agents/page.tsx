'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Bot, Key, Copy } from 'lucide-react';

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'assistant' });
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: agentsList } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => { const { data } = await api.get('/agents'); return data.data; },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/agents', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setNewApiKey(res.data.data.apiKey);
      setShowForm(false);
    },
  });

  const statusColors: Record<string, string> = { active: 'success', paused: 'warning', disabled: 'secondary' };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">AI Agents</h1>
          <p className="text-muted-foreground mt-1">Create and manage your AI-powered agents.</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
        >
          <Plus className="mr-2 h-4 w-4" /> Create Agent
        </Button>
      </div>

      {newApiKey && (
        <Card className="rounded-xl border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-emerald-400" />
              <p className="font-medium text-emerald-400">
                API Key Created -- Save this now, it won&apos;t be shown again!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-border/60 bg-secondary/50 p-3 text-sm font-mono break-all">
                {newApiKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(newApiKey); }}
                className="h-10 w-10 rounded-lg"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-muted-foreground"
              onClick={() => setNewApiKey(null)}
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="rounded-xl border-border/60">
          <CardHeader>
            <CardTitle className="font-serif text-xl">New Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
              className="grid gap-5 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sales Assistant"
                  required
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </Label>
                <select
                  className="h-10 w-full rounded-lg border-input bg-secondary/50 px-3.5 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="assistant">Assistant</option>
                  <option value="automation">Automation</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this agent do?"
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                >
                  Create Agent
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agentsList?.map((agent: any) => (
          <Card
            key={agent.id}
            className="rounded-xl border-border/60 transition-all hover:border-border hover:shadow-[0_0_20px_rgba(var(--primary),0.04)]"
          >
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="font-serif text-base">{agent.name}</CardTitle>
                <CardDescription className="text-xs mt-0.5 truncate">
                  {agent.description || 'No description'}
                </CardDescription>
              </div>
              <Badge
                className={
                  agent.status === 'active'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : agent.status === 'paused'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    : 'border-border/40 bg-secondary/50 text-muted-foreground'
                }
              >
                {agent.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge className="border-border/40 bg-secondary/50 text-xs text-muted-foreground">
                  {agent.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Created {new Date(agent.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!agentsList || agentsList.length === 0) && (
          <Card className="col-span-full rounded-xl border-border/60">
            <CardContent className="py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/50 mx-auto mb-4">
                <Bot className="h-7 w-7 text-muted-foreground/50" />
              </div>
              <p className="font-serif text-lg">No agents yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create one to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
