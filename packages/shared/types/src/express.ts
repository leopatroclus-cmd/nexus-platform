declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      agentId?: string;
      role?: string;
      permissions?: string[];
      isAgent?: boolean;
    }
  }
}

export {};
