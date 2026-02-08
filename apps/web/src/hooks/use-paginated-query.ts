import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

export function usePaginatedQuery(key: string, url: string, extraParams?: Record<string, string>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const params = new URLSearchParams({
    page: String(page),
    limit: '25',
    ...(search && { search }),
    ...(extraParams || {}),
  });

  const query = useQuery({
    queryKey: [key, page, search, extraParams],
    queryFn: async () => {
      const { data } = await api.get(`${url}?${params}`);
      return data;
    },
  });

  return {
    ...query,
    items: query.data?.data || [],
    pagination: query.data?.pagination,
    page,
    setPage,
    search,
    setSearch,
  };
}
