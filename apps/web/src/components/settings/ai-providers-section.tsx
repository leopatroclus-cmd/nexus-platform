'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, TestTube, Loader2, Key, CheckCircle, XCircle } from 'lucide-react';

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI (GPT)' },
  { value: 'google', label: 'Google (Gemini)' },
];

export function AIProvidersSection() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ provider: 'anthropic', apiKey: '', label: '' });
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const { data: keys } = useQuery({
    queryKey: ['provider-keys'],
    queryFn: async () => { const { data } = await api.get('/agents/provider-keys'); return data.data; },
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/agents/provider-keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-keys'] });
      setShowForm(false);
      setForm({ provider: 'anthropic', apiKey: '', label: '' });
      setTestResult(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/agents/provider-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-keys'] }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/agents/provider-keys/test/test', {
        provider: form.provider,
        apiKey: form.apiKey,
      });
      return data.data;
    },
    onSuccess: (data) => setTestResult(data),
  });

  return (
    <Card className="rounded-xl border-border/60 transition-colors hover:border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-serif text-xl">AI Provider Keys</CardTitle>
            <CardDescription className="mt-1">
              Configure API keys for AI providers used by your agents.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Provider
                </Label>
                <select
                  className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm"
                  value={form.provider}
                  onChange={(e) => setForm({ ...form, provider: e.target.value })}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Label
                </Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Production Key"
                  className="h-10 rounded-lg bg-secondary/50"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  API Key
                </Label>
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="h-10 rounded-lg bg-secondary/50 font-mono"
                />
              </div>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                testResult.success
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {testResult.success
                  ? <><CheckCircle className="h-4 w-4" /> API key is valid</>
                  : <><XCircle className="h-4 w-4" /> {testResult.error || 'Invalid API key'}</>
                }
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={!form.apiKey || testMutation.isPending}
                className="rounded-lg"
              >
                {testMutation.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <TestTube className="mr-2 h-4 w-4" />
                }
                Test Key
              </Button>
              <Button
                size="sm"
                onClick={() => addMutation.mutate(form)}
                disabled={!form.apiKey || !form.label || addMutation.isPending}
                className="rounded-lg shadow-[0_0_20px_rgba(var(--primary),0.15)]"
              >
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Key
              </Button>
            </div>
          </div>
        )}

        {keys?.length > 0 ? (
          <div className="space-y-2">
            {keys.map((key: any) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-xl border border-border/60 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Key className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{key.label}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className="border-border/40 bg-secondary/50 text-xs text-muted-foreground">
                        {PROVIDERS.find((p) => p.value === key.provider)?.label || key.provider}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{key.maskedKey}</span>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(key.id)}
                  className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : !showForm && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50 mb-3">
              <Key className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No provider keys configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add one to enable AI agent capabilities</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
