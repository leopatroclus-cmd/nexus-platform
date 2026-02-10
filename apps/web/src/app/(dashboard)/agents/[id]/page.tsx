'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Save, Key, Copy, RotateCcw, Loader2 } from 'lucide-react';

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const agentId = params.id as string;

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
    provider: 'anthropic',
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    requireApproval: true,
  });
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: async () => {
      const { data } = await api.get(`/agents/${agentId}`);
      return data.data;
    },
  });

  const { data: availableTools } = useQuery({
    queryKey: ['available-tools'],
    queryFn: async () => {
      const { data } = await api.get('/agents/available-tools');
      return data.data;
    },
  });

  const { data: availableModels } = useQuery({
    queryKey: ['available-models'],
    queryFn: async () => {
      const { data } = await api.get('/agents/available-models');
      return data.data;
    },
  });

  const { data: actions } = useQuery({
    queryKey: ['agent-actions', agentId],
    queryFn: async () => {
      const { data } = await api.get(`/agents/${agentId}/actions`);
      return data;
    },
  });

  useEffect(() => {
    if (agent) {
      const config = agent.config || {};
      setForm({
        name: agent.name || '',
        description: agent.description || '',
        status: agent.status || 'active',
        provider: config.provider || 'anthropic',
        model: config.model || '',
        systemPrompt: config.systemPrompt || '',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens || 4096,
        requireApproval: config.requireApproval ?? true,
      });
      setSelectedTools(agent.tools?.map((t: any) => t.toolKey) || []);
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { name, description, status, ...configFields } = form;
      await api.put(`/agents/${agentId}`, {
        name,
        description,
        status,
        config: {
          provider: configFields.provider,
          model: configFields.model,
          systemPrompt: configFields.systemPrompt,
          temperature: configFields.temperature,
          maxTokens: configFields.maxTokens,
          requireApproval: configFields.requireApproval,
        },
      });
      await api.put(`/agents/${agentId}/tools`, {
        tools: selectedTools.map((key) => ({ toolKey: key })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', agentId] });
    },
  });

  const regenKeyMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/agents/${agentId}/regenerate-key`);
      return data.data.apiKey;
    },
    onSuccess: (key) => setNewApiKey(key),
  });

  const modelsForProvider = availableModels?.[form.provider] || [];

  const toolsByModule = (availableTools || []).reduce((acc: Record<string, any[]>, tool: any) => {
    const mod = tool.key.startsWith('crm_') ? 'CRM' : tool.key.startsWith('erp_') ? 'ERP' : 'Other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(tool);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/agents')} className="rounded-lg">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl">{agent?.name || 'Agent'}</h1>
          <p className="text-muted-foreground mt-1">Configure AI capabilities, tools, and behavior.</p>
        </div>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="shadow-[0_0_20px_rgba(var(--primary),0.15)]"
        >
          {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      {updateMutation.isSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          Agent configuration saved successfully.
        </div>
      )}

      {/* General */}
      <Card className="rounded-xl border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl">General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="h-10 rounded-lg bg-secondary/50" />
          </div>
        </CardContent>
      </Card>

      {/* AI Config */}
      <Card className="rounded-xl border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl">AI Configuration</CardTitle>
          <CardDescription>Set the AI provider, model, and behavior.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Provider</Label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm"
              value={form.provider}
              onChange={(e) => setForm({ ...form, provider: e.target.value, model: '' })}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="google">Google (Gemini)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</Label>
            <select
              className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3.5 text-sm"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            >
              <option value="">Default</option>
              {modelsForProvider.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Prompt</Label>
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-input bg-secondary/50 p-3 text-sm resize-y"
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              placeholder="Custom instructions for this agent..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Temperature ({form.temperature})
            </Label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max Tokens</Label>
            <Input
              type="number"
              value={form.maxTokens}
              onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
              className="h-10 rounded-lg bg-secondary/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requireApproval}
                onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium">Require approval for destructive actions</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, the agent will ask for user approval before executing actions like creating orders.
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tools */}
      <Card className="rounded-xl border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Tools</CardTitle>
          <CardDescription>Select which tools this agent can use.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(toolsByModule).map(([module, tools]) => (
            <div key={module}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{module}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(tools as any[]).map((tool: any) => (
                  <label
                    key={tool.key}
                    className="flex items-start gap-3 rounded-xl border border-border/60 p-3 cursor-pointer hover:border-border transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTools([...selectedTools, tool.key]);
                        } else {
                          setSelectedTools(selectedTools.filter((k) => k !== tool.key));
                        }
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-input"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{tool.name}</p>
                        {tool.isDestructive && (
                          <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px]">
                            Destructive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {!availableTools?.length && (
            <p className="text-sm text-muted-foreground text-center py-4">No tools available</p>
          )}
        </CardContent>
      </Card>

      {/* API Key */}
      <Card className="rounded-xl border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl">API Key</CardTitle>
          <CardDescription>Used for external API access to this agent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {newApiKey ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <p className="text-sm text-emerald-400 font-medium mb-2">New API Key — save this now!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg border border-border/60 bg-secondary/50 p-2 text-xs font-mono break-all">
                    {newApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(newApiKey)}
                    className="h-8 w-8 rounded-lg"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewApiKey(null)}>Dismiss</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground flex-1">API key is hashed and cannot be displayed.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => regenKeyMutation.mutate()}
                disabled={regenKeyMutation.isPending}
                className="rounded-lg"
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Regenerate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Log */}
      <Card className="rounded-xl border-border/60">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Action Log</CardTitle>
          <CardDescription>Recent actions executed by this agent.</CardDescription>
        </CardHeader>
        <CardContent>
          {actions?.data?.length > 0 ? (
            <div className="space-y-2">
              {actions.data.map((action: any) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{action.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.entityType} &middot; {new Date(action.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={
                    action.status === 'success'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : action.status === 'pending_approval'
                      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                      : 'border-destructive/20 bg-destructive/10 text-destructive'
                  }>
                    {action.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No actions recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
