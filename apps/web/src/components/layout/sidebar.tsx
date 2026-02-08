'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Handshake, CalendarCheck,
  Users2, Package, ShoppingCart, FileText, CreditCard, BookOpen,
  Bot, MessageSquare, Mail, Settings, ChevronDown, Puzzle, Shield, FormInput, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
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
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Org header */}
      <div className="flex items-center gap-3 border-b p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          {org?.name?.[0] || 'N'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{org?.name || 'Nexus'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {allItems.map((item: any) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');

          if (item.children) {
            const isExpanded = expandedSections.has(item.label);
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleSection(item.label)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                    isActive && 'bg-accent',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child: any) => {
                      const ChildIcon = iconMap[child.icon] || Settings;
                      const childActive = pathname === child.path;
                      return (
                        <Link
                          key={child.path}
                          href={child.path}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                            childActive && 'bg-accent font-medium',
                          )}
                        >
                          <ChildIcon className="h-4 w-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
                isActive && 'bg-accent font-medium',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-3">
        <button
          onClick={() => { logout(); window.location.href = '/auth/login'; }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
