'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface AnalyticsPromptBarProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function AnalyticsPromptBar({ onSubmit, isLoading, placeholder }: AnalyticsPromptBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || 'Ask about your data... e.g. "Show revenue by month for Q4"'}
          className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/60 focus-visible:ring-primary/30"
          disabled={isLoading}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="h-11 px-5 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.15)]"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}
