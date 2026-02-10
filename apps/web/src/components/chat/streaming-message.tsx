'use client';

import { cn } from '@/lib/utils';

interface StreamingMessageProps {
  content: string;
  agentName?: string;
}

export function StreamingMessage({ content, agentName }: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[70%] rounded-xl px-4 py-2.5 text-sm bg-card border border-border/60">
        {agentName && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-1">{agentName}</p>
        )}
        <p className="whitespace-pre-wrap">
          {content}
          <span className="inline-block w-2 h-4 ml-0.5 bg-primary/60 animate-pulse rounded-sm" />
        </p>
      </div>
    </div>
  );
}
