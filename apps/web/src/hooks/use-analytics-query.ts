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
  const [error, setError] = useState<string | null>(null);
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

    // Find or auto-create an analytics-capable agent
    const analyticsToolKeys = [
      'erp_revenue_analytics', 'erp_top_products', 'erp_invoice_analytics',
      'erp_payment_analytics', 'erp_inventory_analytics', 'crm_deal_analytics',
    ];

    const { data: agentsRes } = await api.get('/agents');
    let analyticsAgent = agentsRes.data?.find((a: any) =>
      a.status === 'active' && a.tools?.some((t: string) => analyticsToolKeys.includes(t))
    );

    if (!analyticsAgent) {
      // Auto-provision an analytics agent
      const { data: createRes } = await api.post('/agents', {
        name: 'Nexus Analytics',
        description: 'Built-in analytics agent for querying business data',
        type: 'assistant',
        config: { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514' },
      });
      analyticsAgent = createRes.data;

      // Assign all analytics tools
      await api.put(`/agents/${analyticsAgent.id}/tools`, {
        tools: analyticsToolKeys.map(toolKey => ({ toolKey })),
      });
    }

    await api.post(`/chat/conversations/${convId}/participants`, {
      participantType: 'agent',
      participantId: analyticsAgent.id,
    });

    joinConversation(convId);
    return convId;
  }, [conversationId, setConversationId, joinConversation]);

  const sendQuery = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    currentQuery.current = query;

    try {
      const convId = await ensureConversation();
      await api.post(`/chat/conversations/${convId}/messages`, { content: query });
    } catch (err: any) {
      console.error('[useAnalyticsQuery] Error:', err);
      setError(err.message || 'Failed to run analytics query');
      setIsLoading(false);
    }
  }, [ensureConversation]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { sendQuery, isLoading, error, results, clearResults };
}
