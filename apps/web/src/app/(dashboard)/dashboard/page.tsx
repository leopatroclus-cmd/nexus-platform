'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Handshake, FileText, AlertTriangle, Package, Bot, MessageSquare } from 'lucide-react';

export default function DashboardPage() {
  const { org } = useAuthStore();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/api/dashboard');
      return data.data;
    },
  });

  const stats = [
    { label: 'Contacts', value: dashboard?.counts?.contacts ?? '—', icon: Users, color: 'text-blue-600' },
    { label: 'Companies', value: dashboard?.counts?.companies ?? '—', icon: Building2, color: 'text-purple-600' },
    { label: 'Deals', value: dashboard?.counts?.deals ?? '—', icon: Handshake, color: 'text-amber-600' },
    { label: 'Pipeline Value', value: dashboard ? `$${(dashboard.pipelineValue || 0).toLocaleString()}` : '—', icon: FileText, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to {org?.name}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard?.dealsByStage?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.dealsByStage.map((stage: any) => (
                  <div key={stage.stageName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.stageColor || '#6b7280' }} />
                      <span className="text-sm font-medium">{stage.stageName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{stage.count} deals</Badge>
                      <span className="text-sm text-muted-foreground">${parseFloat(stage.value || '0').toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No deals yet. Create your first deal to see the pipeline.</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices & Low Stock */}
        <div className="space-y-6">
          {/* Overdue Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Overdue Invoices</CardTitle>
              {dashboard?.overdueInvoices?.count > 0 && (
                <Badge variant="destructive">{dashboard.overdueInvoices.count}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboard?.overdueInvoices?.count > 0 ? (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">{dashboard.overdueInvoices.count} invoice(s) overdue</p>
                    <p className="text-lg font-bold text-destructive">${dashboard.overdueInvoices.totalDue.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No overdue invoices.</p>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Low Stock Alerts</CardTitle>
              {dashboard?.lowStockItems?.length > 0 && (
                <Badge variant="warning">{dashboard.lowStockItems.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {dashboard?.lowStockItems?.length > 0 ? (
                <div className="space-y-2">
                  {dashboard.lowStockItems.slice(0, 5).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        {item.sku && <span className="text-muted-foreground ml-2">{item.sku}</span>}
                      </div>
                      <Badge variant="destructive">{item.quantityOnHand} left</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No low stock alerts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions & Agent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <a href="/crm/contacts" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent transition-colors">
              <Users className="h-4 w-4 text-blue-600" /> Add a contact
            </a>
            <a href="/crm/deals" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent transition-colors">
              <Handshake className="h-4 w-4 text-amber-600" /> Create a deal
            </a>
            <a href="/agents" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent transition-colors">
              <Bot className="h-4 w-4 text-purple-600" /> Set up an AI agent
            </a>
            <a href="/chat" className="flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent transition-colors">
              <MessageSquare className="h-4 w-4 text-green-600" /> Open chat
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Agent Activity</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.recentAgentActions?.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recentAgentActions.map((action: any) => (
                  <div key={action.id} className="flex items-center justify-between border-b py-2 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.action}</p>
                      <p className="text-xs text-muted-foreground">{action.entityType} &middot; {action.status}</p>
                    </div>
                    <Badge variant={action.status === 'success' ? 'success' : action.status === 'failed' ? 'destructive' : 'secondary'}>
                      {action.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No agent activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
