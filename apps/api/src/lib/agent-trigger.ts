import { eq, and } from 'drizzle-orm';
import { conversationParticipants, messages, agents, agentTools } from '@nexus/database';
import type { Database } from '@nexus/database';
import { executeAgentTurn } from '@nexus/module-agents';

type EmitFn = (room: string, event: string, data: unknown) => void;

export async function triggerAgentForConversation(
  db: Database,
  emit: EmitFn,
  orgId: string,
  conversationId: string,
  senderType: string,
  encryptionKey: string,
): Promise<void> {
  // Only trigger on user messages
  if (senderType !== 'user') return;

  // Check if conversation has an agent participant
  const participants = await db.select().from(conversationParticipants)
    .where(and(
      eq(conversationParticipants.conversationId, conversationId),
      eq(conversationParticipants.participantType, 'agent'),
    ));

  if (participants.length === 0) return;

  // Get the first agent participant
  const agentParticipant = participants[0];

  const [agent] = await db.select().from(agents)
    .where(and(
      eq(agents.id, agentParticipant.participantId),
      eq(agents.orgId, orgId),
      eq(agents.status, 'active'),
    ))
    .limit(1);

  if (!agent) return;

  // Get agent tools
  const toolsList = await db.select().from(agentTools)
    .where(eq(agentTools.agentId, agent.id));

  // Get conversation history
  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  // Get the latest user message (the one that just triggered this)
  const latestMsg = history[history.length - 1];
  if (!latestMsg || latestMsg.senderType !== 'user') return;

  // History is everything except the last message (that's the user message passed separately)
  const historyForAgent = history.slice(0, -1);

  // Execute in background
  executeAgentTurn(
    { db, emit, orgId, encryptionKey },
    agent,
    toolsList.map((t) => t.toolKey),
    conversationId,
    latestMsg.content,
    historyForAgent,
  ).catch((err) => {
    console.error('[AgentTrigger] Error executing agent turn:', err);
  });
}
