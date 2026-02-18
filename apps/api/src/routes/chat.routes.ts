import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';

const router = Router();

const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || 'e9ddc85cb4802c728062d6547704223c56be07007c97fb61';

router.post('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { message, stream = false } = req.body;
    const orgId = req.orgId!;
    const userId = req.userId!;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Send only the current message — OpenClaw manages session history
    // via the `user` field which derives a stable session key
    const messages = [
      { role: 'user' as const, content: message }
    ];

    if (stream) {
      // Streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': 'nexus',
        },
        body: JSON.stringify({
          model: 'openclaw:nexus',
          messages,
          user: `nexus:${orgId}:${userId}`,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        res.write(`data: ${JSON.stringify({ error })}\n\n`);
        res.end();
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`);
        res.end();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              res.write(`data: ${data}\n\n`);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      res.end();
    } else {
      // Non-streaming response
      const response = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
          'Content-Type': 'application/json',
          'x-openclaw-agent-id': 'nexus',
        },
        body: JSON.stringify({
          model: 'openclaw:nexus',
          messages,
          user: `nexus:${orgId}:${userId}`,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ success: false, error });
      }

      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const assistantMessage = data.choices?.[0]?.message?.content || '';

      res.json({ 
        success: true, 
        data: { message: assistantMessage }
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Chat history is managed by OpenClaw sessions (stable session key derived from user field)

export default router;
