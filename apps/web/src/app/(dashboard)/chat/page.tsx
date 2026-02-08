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
import { MessageSquare, Send, Plus, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { joinConversation, leaveConversation, onEvent, isConnected } = useSocket();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvRef = useRef<string | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => { const { data } = await api.get('/api/chat/conversations'); return data.data; },
  });

  const { data: convDetail } = useQuery({
    queryKey: ['conversation', selectedConv],
    queryFn: async () => {
      if (!selectedConv) return null;
      const { data } = await api.get(`/api/chat/conversations/${selectedConv}`);
      return data.data;
    },
    enabled: !!selectedConv,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) => api.post(`/api/chat/conversations/${selectedConv}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', selectedConv] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessage('');
    },
  });

  const createConvMutation = useMutation({
    mutationFn: () => api.post('/api/chat/conversations', { type: 'general', title: 'New Conversation' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setSelectedConv(res.data.data.id);
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
      // Add to the current conversation's messages
      queryClient.setQueryData(['conversation', msg.conversationId], (old: any) => {
        if (!old) return old;
        return { ...old, messages: [...(old.messages || []), msg] };
      });
    });
    return cleanup;
  }, [onEvent, queryClient]);

  // Listen for conversation updates (new messages in other conversations)
  useEffect(() => {
    const cleanup = onEvent('conversation-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return cleanup;
  }, [onEvent, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convDetail?.messages]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation list */}
      <div className="w-80 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Inbox</h2>
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => createConvMutation.mutate()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1 overflow-y-auto">
          {conversations?.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md p-3 text-left text-sm transition-colors hover:bg-accent',
                selectedConv === conv.id && 'bg-accent',
              )}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{conv.title || 'Conversation'}</p>
                <p className="text-xs text-muted-foreground">{conv.type} &middot; {conv.status}</p>
              </div>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Message area */}
      <Card className="flex-1 flex flex-col">
        {selectedConv && convDetail ? (
          <>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-base">{convDetail.title || 'Conversation'}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {convDetail.messages?.map((msg: any) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[70%] rounded-lg px-4 py-2 text-sm', isMe ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {msg.contentType === 'action_request' && (
                        <div className="flex items-center gap-2 mb-1"><Badge variant="warning">Action Request</Badge></div>
                      )}
                      {msg.contentType === 'action_result' && (
                        <div className="flex items-center gap-2 mb-1"><Badge variant="success">Action Result</Badge></div>
                      )}
                      <p>{msg.content}</p>
                      {msg.contentType === 'action_request' && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7"><CheckCircle className="mr-1 h-3 w-3" /> Approve</Button>
                          <Button size="sm" variant="outline" className="h-7"><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </CardContent>
            <div className="border-t p-4">
              <form onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMutation.mutate(message); }} className="flex gap-2">
                <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1" />
                <Button type="submit" disabled={sendMutation.isPending || !message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation or create a new one
          </CardContent>
        )}
      </Card>
    </div>
  );
}
