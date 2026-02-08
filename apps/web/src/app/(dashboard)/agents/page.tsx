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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="mr-2 h-4 w-4" /> Create Agent</Button>
      </div>

      {newApiKey && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4" />
              <p className="font-medium">API Key Created - Save this now, it won&apos;t be shown again!</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white p-2 text-sm font-mono break-all">{newApiKey}</code>
              <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newApiKey); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNewApiKey(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card><CardHeader><CardTitle>New Agent</CardTitle></CardHeader><CardContent>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sales Assistant" required /></div>
            <div className="space-y-2"><Label>Type</Label>
              <select className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="assistant">Assistant</option><option value="automation">Automation</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this agent do?" /></div>
            <div className="flex items-end gap-2"><Button type="submit" disabled={createMutation.isPending}>Create Agent</Button></div>
          </form>
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agentsList?.map((agent: any) => (
          <Card key={agent.id}>
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">{agent.name}</CardTitle>
                <CardDescription>{agent.description || 'No description'}</CardDescription>
              </div>
              <Badge variant={statusColors[agent.status] as any}>{agent.status}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="outline">{agent.type}</Badge>
                <span className="text-xs text-muted-foreground">Created {new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!agentsList || agentsList.length === 0) && (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">No agents yet. Create one to get started.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
