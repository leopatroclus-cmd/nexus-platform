import { create } from 'zustand';

interface AnalyticsState {
  conversationId: string | null;
  setConversationId: (id: string) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()((set) => ({
  conversationId: null,
  setConversationId: (id) => set({ conversationId: id }),
}));
