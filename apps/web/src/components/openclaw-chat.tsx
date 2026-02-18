'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function OpenClawChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    // Add placeholder assistant message for streaming
    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('http://127.0.0.1:18789/hooks', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer nexus-webhook-secret',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const content = accumulated;
          setMessages((prev) =>
            prev.map((m, i) => (i === assistantIdx ? { ...m, content } : m)),
          );
        }

        // If nothing was streamed, show a fallback
        if (!accumulated) {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIdx ? { ...m, content: '(No response)' } : m,
            ),
          );
        }
      } else {
        // Non-streaming fallback
        const body = await res.text();
        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIdx ? { ...m, content: body || '(No response)' } : m,
          ),
        );
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIdx
            ? { ...m, content: `Error: ${err.message || 'Failed to reach OpenClaw'}` }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <Card className="fixed bottom-20 right-6 z-[60] w-96 h-[28rem] flex flex-col rounded-xl border-border/60 shadow-2xl">
          <CardHeader className="border-b border-border/60 py-3 px-4 flex-shrink-0">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              OpenClaw
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50 mb-3">
                  <Bot className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Send a message to get started</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.15)]'
                      : 'bg-card border border-border/60',
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content || (loading && i === messages.length - 1 ? '...' : '')}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </CardContent>
          <div className="border-t border-border/60 p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 h-9 rounded-lg bg-secondary/50 text-sm"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                className="h-9 w-9 rounded-lg p-0 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Toggle button */}
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className="fixed bottom-6 right-6 z-[60] h-12 w-12 rounded-full shadow-lg shadow-primary/20"
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </Button>
    </>
  );
}
