import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  org: Org | null;
  organizations: Org[];
  role: string | null;
  isAuthenticated: boolean;

  setAuth: (data: {
    accessToken: string; refreshToken: string;
    user: AuthUser; org: Org; organizations?: Org[];
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  switchOrg: (org: Org, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      org: null,
      organizations: [],
      role: null,
      isAuthenticated: false,

      setAuth: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          org: data.org,
          organizations: data.organizations || [],
          isAuthenticated: true,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      switchOrg: (org, accessToken, refreshToken) =>
        set({ org, accessToken, refreshToken }),

      logout: () =>
        set({
          accessToken: null, refreshToken: null, user: null, org: null,
          organizations: [], role: null, isAuthenticated: false,
        }),
    }),
    { name: 'nexus-auth' },
  ),
);
