'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Handshake, CalendarCheck,
  Users2, Package, ShoppingCart, FileText, CreditCard, BookOpen,
  Bot, MessageSquare, Mail, Settings, ChevronDown, Puzzle, Shield, FormInput, LogOut,
  Sun, Moon,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';

const iconMap: Record<string, any> = {
  LayoutDashboard, Users, Building2, Handshake, CalendarCheck,
  Users2, Package, ShoppingCart, FileText, CreditCard, BookOpen,
  Bot, MessageSquare, Mail, Settings, Puzzle, Shield, FormInput, Building: Building2,
};

export function Sidebar() {
  const pathname = usePathname();
  const { org, user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Settings']));

  const { data: navData } = useQuery({
    queryKey: ['navigation'],
    queryFn: async () => {
      const { data } = await api.get('/modules/navigation');
      return data.data as Array<{ moduleKey: string; items: any[] }>;
    },
  });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const allItems = navData?.flatMap((m) => m.items) || [];

  return (
    <div className="flex h-full w-64 flex-col bg-[hsl(var(--sidebar-bg))] border-r border-border/40">
      {/* Org header */}
      <div className="flex items-center gap-3 border-b border-border/40 p-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold shadow-md shadow-primary/20">
          {org?.name?.[0] || 'N'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-foreground">{org?.name || 'Nexus'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {allItems.map((item: any) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

          if (item.children) {
            const isExpanded = expandedSections.has(item.label);
            const hasActiveChild = item.children.some((c: any) => pathname === c.path || pathname.startsWith(c.path + '/'));
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 hover:bg-secondary/60',
                    (isActive || hasActiveChild) && 'text-foreground',
                    !isActive && !hasActiveChild && 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isExpanded && 'rotate-180')} />
                </button>
                <div className={cn(
                  'overflow-hidden transition-all duration-200',
                  isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
                )}>
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/40 pl-3">
                    {item.children.map((child: any) => {
                      const ChildIcon = iconMap[child.icon] || Settings;
                      const childActive = pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          href={child.path}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-all duration-200',
                            childActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                          )}
                        >
                          <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 group relative',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary shadow-[0_0_8px_hsl(24_95%_53%/0.5)]" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border/40 p-3 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-all duration-200"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => { logout(); window.location.href = '/auth/login'; }}
          className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
