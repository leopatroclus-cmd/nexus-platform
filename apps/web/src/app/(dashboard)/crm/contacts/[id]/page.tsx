'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Mail, Phone, Briefcase } from 'lucide-react';
import { CustomFieldsDisplay } from '@/components/custom-fields-renderer';

export default function ContactDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data } = await api.get(`/crm/contacts/${id}`);
      return data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/crm/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      router.push('/crm/contacts');
    },
  });

  const { data: notes } = useQuery({
    queryKey: ['notes', 'crm_contact', id],
    queryFn: async () => {
      const { data } = await api.get(`/crm/notes?relatedType=crm_contact&relatedId=${id}`);
      return data.data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ['activities', 'crm_contact', id],
    queryFn: async () => {
      const { data } = await api.get(`/crm/activities?relatedType=crm_contact&relatedId=${id}`);
      return data.data;
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!contact) return <div className="text-muted-foreground">Contact not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{contact.firstName} {contact.lastName}</h1>
          <Badge variant={contact.status === 'active' ? 'success' : 'secondary'}>{contact.status}</Badge>
        </div>
        <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate()}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.email || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.jobTitle || '—'}</span>
            </div>
            {contact.tags?.length > 0 && (
              <div className="flex gap-1 flex-wrap col-span-2">
                {contact.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            )}
            {contact.customData && (
              <div className="col-span-2">
                <CustomFieldsDisplay entityType="crm_contact" values={contact.customData} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes ({notes?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {notes?.length ? notes.map((note: any) => (
                <div key={note.id} className="border-b py-2 last:border-0">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>
                </div>
              )) : <p className="text-sm text-muted-foreground">No notes yet</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Activities ({activities?.length || 0})</CardTitle></CardHeader>
            <CardContent>
              {activities?.length ? activities.map((act: any) => (
                <div key={act.id} className="border-b py-2 last:border-0">
                  <p className="text-sm font-medium">{act.title}</p>
                  <Badge variant="outline" className="mt-1">{act.type}</Badge>
                </div>
              )) : <p className="text-sm text-muted-foreground">No activities yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
