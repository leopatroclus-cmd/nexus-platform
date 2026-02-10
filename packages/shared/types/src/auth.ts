export interface JwtPayload {
  sub: string;
  orgId: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh';
  jti?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  orgId?: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface SwitchOrgInput {
  orgId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: string;
  permissions: string[];
}

export interface AgentAuth {
  agentId: string;
  orgId: string;
  agentName: string;
  permissions: string[];
  tools: string[];
}
