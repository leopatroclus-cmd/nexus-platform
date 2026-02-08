'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, User, Building2, Handshake, Package, FileText, ShoppingCart, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';

const typeIcons: Record<string, any> = {
  contact: User, company: Building2, deal: Handshake, client: Building2,
  inventory: Package, invoice: FileText, order: ShoppingCart,
};

const typeColors: Record<string, string> = {
  contact: 'bg-blue-100 text-blue-700', company: 'bg-purple-100 text-purple-700',
  deal: 'bg-green-100 text-green-700', client: 'bg-orange-100 text-orange-700',
  inventory: 'bg-cyan-100 text-cyan-700', invoice: 'bg-amber-100 text-amber-700',
  order: 'bg-pink-100 text-pink-700',
};

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  path: string;
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, org, organizations, switchOrg } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setShowResults(false); return; }
    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
        setResults(data.data);
        setShowResults(true);
      } catch { setResults([]); }
      setIsSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    router.push(result.path);
    setQuery('');
    setShowResults(false);
  }

  async function handleSwitchOrg(orgId: string) {
    try {
      const { data } = await api.post('/api/auth/switch-org', { orgId });
      switchOrg(data.data.org, data.data.accessToken, data.data.refreshToken);
      window.location.reload();
    } catch { /* ignore */ }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <div ref={searchRef} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts, companies, invoices..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border bg-background shadow-lg">
              {results.length === 0 && !isSearching && (
                <div className="p-4 text-center text-sm text-muted-foreground">No results found</div>
              )}
              {isSearching && (
                <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
              )}
              {results.map((result) => {
                const Icon = typeIcons[result.type] || Search;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.title}</p>
                      {result.subtitle && <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>}
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${typeColors[result.type] || ''}`}>
                      {result.type}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {organizations.length > 1 && (
          <select
            value={org?.id || ''}
            onChange={(e) => handleSwitchOrg(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {organizations.map((o: any) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
