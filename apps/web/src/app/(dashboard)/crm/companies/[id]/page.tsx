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

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!company) return <div className="text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">{company.name}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Company Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{company.domain || '—'}</span></div>
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{company.email || '—'}</span></div>
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{company.phone || '—'}</span></div>
          <div className="text-sm"><span className="text-muted-foreground">Industry:</span> {company.industry || '—'}</div>
          <div className="text-sm"><span className="text-muted-foreground">Size:</span> {company.size || '—'}</div>
        </CardContent>
      </Card>
    </div>
  );
}
