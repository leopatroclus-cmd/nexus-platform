'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useSocket } from '@/hooks/use-socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StreamingMessage } from '@/components/chat/streaming-message';
import { MessageSquare, Send, Plus, CheckCircle, XCircle, Wifi, WifiOff, Bot, Wrench, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { joinConversation, leaveConversation, onEvent, isConnected } = useSocket();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string | null>(null);

  // Streaming state
  const [streamingContent, setStreamingContent] = useState<Map<string, string>>(new Map());
  const [agentTyping, setAgentTyping] = useState<Map<string, boolean>>(new Map());
  const [toolExecutions, setToolExecutions] = useState<Map<string, { name: string; status: string }>>(new Map());
  const [showAgentSelector, setShowAgentSelector] = useState(false);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/chat/conversations');
      return (data.data as any[]).filter((c: any) => c.type !== 'analytics');
    },
  });

  const { data: convDetail } = useQuery({
    queryKey: ['conversation', selectedConv],
    queryFn: async () => {
      if (!selectedConv) return null;
      const { data } = await api.get(`/chat/conversations/${selectedConv}`);
      return data.data;
    },
    enabled: !!selectedConv,
  });

  const { data: agentsList } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => { const { data } = await api.get('/agents'); return data.data; },
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post(`/chat/conversations/${selectedConv}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessage('');
    },
  });

  const createConvMutation = useMutation({
    mutationFn: () => api.post('/chat/conversations', { type: 'general', title: 'New Conversation' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConv(res.data.data.id);
    },
  });

  const addParticipantMutation = useMutation({
    mutationFn: (agentId: string) =>
      api.post(`/chat/conversations/${selectedConv}/participants`, {
        participantType: 'agent',
        participantId: agentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
      setShowAgentSelector(false);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (actionId: string) => api.post(`/agents/actions/${actionId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (actionId: string) => api.post(`/agents/actions/${actionId}/reject`, { reason: 'User rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
    },
  });

  // Join/leave Socket.IO rooms when conversation changes
  useEffect(() => {
    if (prevConvRef.current) {
      leaveConversation(prevConvRef.current);
    }
    if (selectedConv) {
      joinConversation(selectedConv);
    }
    prevConvRef.current = selectedConv;

    return () => {
      if (selectedConv) leaveConversation(selectedConv);
    };
  }, [selectedConv, joinConversation, leaveConversation]);

  // Listen for real-time messages
  useEffect(() => {
    const cleanup = onEvent('new-message', (msg: any) => {
      queryClient.setQueryData(['conversation', msg.conversationId], (old: any) => {
        if (!old) return old;
        const exists = old.messages?.some((m: any) => m.id === msg.id);
        if (exists) return old;
        return { ...old, messages: [...(old.messages || []), msg] };
      });
      // Clear streaming content for this conversation
      setStreamingContent((prev) => {
        const next = new Map(prev);
        next.delete(msg.conversationId);
        return next;
      });
    });
    return cleanup;
  }, [onEvent, queryClient]);

  // Listen for conversation updates
  useEffect(() => {
    const cleanup = onEvent('conversation-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return cleanup;
  }, [onEvent, queryClient]);

  // Listen for streaming chunks
  useEffect(() => {
    const cleanup = onEvent('message-stream', (data: any) => {
      if (data.isComplete) {
        setStreamingContent((prev) => {
          const next = new Map(prev);
          next.delete(data.conversationId);
          return next;
        });
        return;
      }
      if (data.chunk) {
        setStreamingContent((prev) => {
          const next = new Map(prev);
          const current = next.get(data.conversationId) || '';
          next.set(data.conversationId, current + data.chunk);
          return next;
        });
      }
    });
    return cleanup;
  }, [onEvent]);

  // Listen for agent typing
  useEffect(() => {
    const cleanupTyping = onEvent('agent-typing', (data: any) => {
      setAgentTyping((prev) => new Map(prev).set(data.conversationId, true));
    });
    const cleanupStop = onEvent('agent-typing-stop', (data: any) => {
      setAgentTyping((prev) => {
        const next = new Map(prev);
        next.delete(data.conversationId);
        return next;
      });
    });
    return () => { cleanupTyping(); cleanupStop(); };
  }, [onEvent]);

  // Listen for tool execution
  useEffect(() => {
    const cleanup = onEvent('tool-execution', (data: any) => {
      setToolExecutions((prev) => new Map(prev).set(data.toolName, data));
      if (data.status === 'completed') {
        setTimeout(() => {
          setToolExecutions((prev) => {
            const next = new Map(prev);
            next.delete(data.toolName);
            return next;
          });
        }, 3000);
      }
    });
    return cleanup;
  }, [onEvent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convDetail?.messages, streamingContent]);

  const hasAgentParticipant = convDetail?.participants?.some((p: any) => p.participantType === 'agent');
  const currentStreaming = selectedConv ? streamingContent.get(selectedConv) : undefined;
  const isTyping = selectedConv ? agentTyping.get(selectedConv) : false;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-5">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl">Inbox</h2>
            {isConnected ? (
              <div className="flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Offline</span>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => createConvMutation.mutate()}
            className="h-8 w-8 rounded-lg p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1 overflow-y-auto flex-1">
          {conversations?.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all',
                selectedConv === conv.id
                  ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.08)]'
                  : 'border-border/60 hover:border-border',
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{conv.title || 'Conversation'}</p>
                <p className="text-xs text-muted-foreground">{conv.type} &middot; {conv.status}</p>
              </div>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50 mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Message area */}
      <Card className="flex-1 flex flex-col rounded-xl border-border/60">
        {selectedConv && convDetail ? (
          <>
            <CardHeader className="border-b border-border/60 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg">
                  {convDetail.title || 'Conversation'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {hasAgentParticipant && (
                    <Badge className="border-primary/20 bg-primary/10 text-primary text-xs">
                      <Bot className="mr-1 h-3 w-3" /> Agent Active
                    </Badge>
                  )}
                  {!hasAgentParticipant && (
                    <div className="relative">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAgentSelector(!showAgentSelector)}
                        className="h-8 rounded-lg"
                      >
                        <UserPlus className="mr-2 h-3.5 w-3.5" /> Invite Agent
                      </Button>
                      {showAgentSelector && (
                        <div className="absolute right-0 top-full mt-1 z-10 w-56 rounded-xl border border-border/60 bg-card p-2 shadow-lg">
                          {agentsList?.filter((a: any) => a.status === 'active').map((agent: any) => (
                            <button
                              key={agent.id}
                              onClick={() => addParticipantMutation.mutate(agent.id)}
                              className="flex w-full items-center gap-2 rounded-lg p-2 text-sm hover:bg-secondary/50 transition-colors"
                            >
                              <Bot className="h-4 w-4 text-primary" />
                              <span>{agent.name}</span>
                            </button>
                          ))}
                          {(!agentsList || agentsList.filter((a: any) => a.status === 'active').length === 0) && (
                            <p className="text-xs text-muted-foreground p-2">No active agents</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Tool execution badges */}
              {toolExecutions.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Array.from(toolExecutions.values()).map((te, i) => (
                    <Badge key={i} className="border-primary/20 bg-primary/10 text-primary text-xs">
                      <Wrench className="mr-1 h-3 w-3" />
                      {te.name}: {te.status}
                    </Badge>
                  ))}
                </div>
              )}

              {convDetail.messages?.map((msg: any) => {
                const isMe = msg.senderId === user?.id;
                const isAgent = msg.senderType === 'agent';
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[70%] rounded-xl px-4 py-2.5 text-sm',
                        isMe
                          ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.15)]'
                          : 'bg-card border border-border/60',
                      )}
                    >
                      {isAgent && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Agent</p>
                      )}
                      {msg.contentType === 'action_request' && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs">
                            Action Request
                          </Badge>
                        </div>
                      )}
                      {msg.contentType === 'action_result' && (
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs">
                            Action Result
                          </Badge>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.contentType === 'action_request' && msg.metadata?.actionId && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                            onClick={() => approveMutation.mutate(msg.metadata.actionId)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="mr-1 h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-lg border-destructive/20 text-destructive hover:bg-destructive/10"
                            onClick={() => rejectMutation.mutate(msg.metadata.actionId)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="mr-1 h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}
                      <p className="text-xs opacity-60 mt-1.5">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Streaming message */}
              {currentStreaming && (
                <StreamingMessage content={currentStreaming} agentName="Agent" />
              )}

              {/* Typing indicator */}
              {isTyping && !currentStreaming && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-4 py-2.5 text-sm bg-card border border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">Agent</p>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t border-border/60 p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(message); }}
                className="flex gap-3"
              >
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 h-10 rounded-lg bg-secondary/50"
                />
                <Button
                  type="submit"
                  disabled={sendMutation.isPending || !message.trim()}
                  className="h-10 w-10 rounded-lg p-0 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/50 mb-4">
              <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="font-serif text-lg">Select a conversation</p>
            <p className="text-sm text-muted-foreground mt-1">or create a new one to get started</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
