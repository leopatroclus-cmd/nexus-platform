export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  filter?: Record<string, string>;
}

export interface RequestWithAuth {
  userId?: string;
  orgId?: string;
  agentId?: string;
  role?: string;
  permissions?: string[];
}
