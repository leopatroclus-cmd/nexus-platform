'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Users, Building2, Handshake, TrendingUp, AlertTriangle, Package, Bot, MessageSquare, ArrowUpRight } from 'lucide-react';

const stageColors = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];

export default function DashboardPage() {
  const { org, user } = useAuthStore();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/dashboard');
      return data.data;
    },
  });

  const stats = [
    { label: 'Contacts', value: dashboard?.counts?.contacts ?? '—', icon: Users, gradient: 'from-blue-500/10 to-blue-500/5', iconColor: 'text-blue-400', borderColor: 'border-blue-500/20' },
    { label: 'Companies', value: dashboard?.counts?.companies ?? '—', icon: Building2, gradient: 'from-violet-500/10 to-violet-500/5', iconColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
    { label: 'Deals', value: dashboard?.counts?.deals ?? '—', icon: Handshake, gradient: 'from-amber-500/10 to-amber-500/5', iconColor: 'text-amber-400', borderColor: 'border-amber-500/20' },
    { label: 'Pipeline Value', value: dashboard ? `$${(dashboard.pipelineValue || 0).toLocaleString()}` : '—', icon: TrendingUp, gradient: 'from-emerald-500/10 to-emerald-500/5', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening at {org?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className={`border-${stat.borderColor} overflow-hidden`} style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className={`relative p-5 bg-gradient-to-br ${stat.gradient}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</p>
                  <p className="text-2xl font-bold font-sans tracking-tight">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/50 ${stat.iconColor}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline Summary — wider */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Deal Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.dealsByStage?.length > 0 ? (
              <div className="space-y-4">
                {dashboard.dealsByStage.map((stage: any, i: number) => {
                  const maxValue = Math.max(...dashboard.dealsByStage.map((s: any) => parseFloat(s.value || '0')));
                  const pct = maxValue > 0 ? (parseFloat(stage.value || '0') / maxValue) * 100 : 0;
                  return (
                    <div key={stage.stageName} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.stageName}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{stage.count} deals</span>
                          <span className="font-medium tabular-nums">${parseFloat(stage.value || '0').toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={`h-full rounded-full ${stageColors[i % stageColors.length]} transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Handshake className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No deals yet</p>
                <Link href="/crm/deals" className="text-sm text-primary mt-1 hover:underline">Create your first deal</Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Invoices */}
          <Card className={dashboard?.overdueInvoices?.count > 0 ? 'border-destructive/20' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Overdue Invoices</CardTitle>
              {dashboard?.overdueInvoices?.count > 0 && (
                <Badge variant="destructive">{dashboard.overdueInvoices.count}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboard?.overdueInvoices?.count > 0 ? (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{dashboard.overdueInvoices.count} invoice(s) overdue</p>
                    <p className="text-xl font-bold text-destructive">${dashboard.overdueInvoices.totalDue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">All invoices up to date.</p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Low Stock</CardTitle>
              {dashboard?.lowStockItems?.length > 0 && (
                <Badge variant="warning">{dashboard.lowStockItems.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboard?.lowStockItems?.length > 0 ? (
                <div className="space-y-2.5">
                  {dashboard.lowStockItems.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                      <Badge variant="destructive" className="shrink-0 ml-2">{item.quantityOnHand}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Stock levels healthy.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { href: '/crm/contacts', icon: Users, label: 'Add Contact', color: 'text-blue-400' },
              { href: '/crm/deals', icon: Handshake, label: 'Create Deal', color: 'text-amber-400' },
              { href: '/agents', icon: Bot, label: 'Setup Agent', color: 'text-violet-400' },
              { href: '/chat', icon: MessageSquare, label: 'Open Chat', color: 'text-emerald-400' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-secondary/60 transition-all duration-200 group"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-secondary ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="font-medium">{action.label}</span>
                <ArrowUpRight className="h-3.5 w-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Agent Activity */}
        <Card>
          <CardHeader><CardTitle>Recent Agent Activity</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.recentAgentActions?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentAgentActions.map((action: any) => (
                  <div key={action.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Bot className="h-4 w-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{action.action}</p>
                        <p className="text-xs text-muted-foreground">{action.entityType}</p>
                      </div>
                    </div>
                    <Badge variant={action.status === 'success' ? 'success' : action.status === 'failed' ? 'destructive' : 'secondary'}>
                      {action.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Bot className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No agent activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
