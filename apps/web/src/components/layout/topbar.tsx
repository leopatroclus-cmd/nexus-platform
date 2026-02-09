'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Search, User, Building2, Handshake, Package, FileText, ShoppingCart, Menu, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

const typeIcons: Record<string, any> = {
  contact: User, company: Building2, deal: Handshake, client: Building2,
  inventory: Package, invoice: FileText, order: ShoppingCart,
};

const typeColors: Record<string, string> = {
  contact: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  company: 'border-violet-500/20 bg-violet-500/10 text-violet-400',
  deal: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  client: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  inventory: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
  invoice: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  order: 'border-pink-500/20 bg-pink-500/10 text-pink-400',
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
    <header className="flex h-14 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-sm px-6">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <div ref={searchRef} className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="Search everything..."
            className="pl-9 h-9 bg-secondary/30 border-border/40 focus-visible:bg-secondary/60"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
          />
          {showResults && (
            <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/20 animate-slide-down">
              {results.length === 0 && !isSearching && (
                <div className="p-6 text-center text-sm text-muted-foreground">No results found</div>
              )}
              {isSearching && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <div className="inline-block h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2" />
                  Searching...
                </div>
              )}
              {results.map((result) => {
                const Icon = typeIcons[result.type] || Search;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-primary/[0.05] transition-colors border-b border-border/20 last:border-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-foreground">{result.title}</p>
                      {result.subtitle && <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>}
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${typeColors[result.type] || ''}`}>
                      {result.type}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {organizations.length > 1 && (
          <div className="relative">
            <select
              value={org?.id || ''}
              onChange={(e) => handleSwitchOrg(e.target.value)}
              className="h-8 appearance-none rounded-lg border border-border/40 bg-secondary/30 pl-3 pr-8 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary/60 transition-colors"
            >
              {organizations.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>
        )}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_hsl(38_92%_55%/0.6)]" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-primary/50 text-primary-foreground text-xs font-bold shadow-sm">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
