'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useSocket } from './use-socket';
import { useAnalyticsStore } from '@/stores/analytics';
import { inferChartType } from '@/components/analytics/chart-type-inference';
import type { AnalyticsResult } from '@/components/analytics/analytics-chart-card';

export function useAnalyticsQuery() {
  const { joinConversation, onEvent } = useSocket();
  const { conversationId, setConversationId } = useAnalyticsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalyticsResult[]>([]);

  // Track pending tool results to pair with message-stream completion
  const pendingToolResults = useRef<Map<string, { toolName: string; toolArgs: Record<string, unknown>; result: unknown }>>(new Map());
  const currentQuery = useRef<string>('');

  // Join socket room when conversationId changes
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
    }
  }, [conversationId, joinConversation]);

  // Listen for tool-execution events with result data
  useEffect(() => {
    const cleanup = onEvent('tool-execution', (data: any) => {
      if (data.status === 'completed' && data.result !== undefined) {
        pendingToolResults.current.set(data.toolName, {
          toolName: data.toolName,
          toolArgs: data.toolArgs || {},
          result: data.result,
        });

        // Immediately create a chart result for this tool execution
        const chartType = inferChartType(data.toolName, data.result);
        const newResult: AnalyticsResult = {
          id: `${Date.now()}-${data.toolName}`,
          query: currentQuery.current,
          toolName: data.toolName,
          toolArgs: data.toolArgs || {},
          chartType,
          data: data.result,
        };
        setResults(prev => [...prev, newResult]);
      }
    });
    return cleanup;
  }, [onEvent]);

  // Listen for message-stream completion to add agent summary
  useEffect(() => {
    let streamedText = '';

    const cleanupStream = onEvent('message-stream', (data: any) => {
      if (data.isComplete) {
        // Attach summary to the most recent result(s) that don't have one
        if (streamedText.trim()) {
          setResults(prev => {
            const updated = [...prev];
            for (let i = updated.length - 1; i >= 0; i--) {
              if (!updated[i].summary) {
                updated[i] = { ...updated[i], summary: streamedText.trim() };
                break;
              }
            }
            return updated;
          });
        }
        streamedText = '';
        setIsLoading(false);
        pendingToolResults.current.clear();
      } else if (data.chunk) {
        streamedText += data.chunk;
      }
    });

    return cleanupStream;
  }, [onEvent]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;

    // Create a hidden analytics conversation
    const { data: convRes } = await api.post('/chat/conversations', {
      type: 'analytics',
      title: 'Analytics',
    });
    const convId = convRes.data.id;
    setConversationId(convId);

    // Add an analytics-capable agent as participant
    const { data: agentsRes } = await api.get('/agents');
    const analyticsAgent = agentsRes.data?.find((a: any) =>
      a.status === 'active' && a.tools?.some((t: string) =>
        ['revenue_analytics', 'top_products', 'invoice_analytics', 'payment_analytics', 'inventory_analytics', 'deal_pipeline_analytics'].includes(t)
      )
    );

    if (analyticsAgent) {
      await api.post(`/chat/conversations/${convId}/participants`, {
        participantType: 'agent',
        participantId: analyticsAgent.id,
      });
    }

    joinConversation(convId);
    return convId;
  }, [conversationId, setConversationId, joinConversation]);

  const sendQuery = useCallback(async (query: string) => {
    setIsLoading(true);
    currentQuery.current = query;

    try {
      const convId = await ensureConversation();
      await api.post(`/chat/conversations/${convId}/messages`, { content: query });
    } catch (err) {
      console.error('[useAnalyticsQuery] Error:', err);
      setIsLoading(false);
    }
  }, [ensureConversation]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { sendQuery, isLoading, results, clearResults };
}
