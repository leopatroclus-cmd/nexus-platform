'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Globe, Mail, Phone } from 'lucide-react';

export default function CompanyDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => { const { data } = await api.get(`/crm/companies/${id}`); return data.data; },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading...</div>;
  if (!company) return <div className="flex items-center justify-center py-20 text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="border-border bg-transparent hover:bg-secondary rounded-lg"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-serif text-3xl">{company.name}</h1>
          <p className="text-muted-foreground mt-1">Company details and information</p>
        </div>
      </div>

      {/* Company Details Card */}
      <Card className="rounded-xl border-border/60 hover:border-border transition-colors">
        <CardHeader>
          <CardTitle className="font-serif text-xl">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Globe className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Domain</p>
              <p className="text-sm font-medium mt-0.5">{company.domain || '\u2014'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10">
              <Mail className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="text-sm font-medium mt-0.5">{company.email || '\u2014'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
              <Phone className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
              <p className="text-sm font-medium mt-0.5">{company.phone || '\u2014'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <span className="text-amber-400 text-sm font-semibold">Ind</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</p>
              <p className="text-sm font-medium mt-0.5">{company.industry || '\u2014'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10">
              <span className="text-rose-400 text-sm font-semibold">Sz</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</p>
              <p className="text-sm font-medium mt-0.5">{company.size || '\u2014'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
