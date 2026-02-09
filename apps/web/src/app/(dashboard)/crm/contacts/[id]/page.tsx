'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Mail, Phone, Briefcase, FileText, Activity, Tag } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg shimmer" />
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg shimmer" />
            <div className="h-5 w-24 rounded shimmer" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 h-64 rounded-xl shimmer" />
          <div className="space-y-6">
            <div className="h-48 rounded-xl shimmer" />
            <div className="h-48 rounded-xl shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
          <Mail className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <h2 className="font-serif text-xl mb-1">Contact not found</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This contact may have been deleted or you may not have access.
        </p>
        <Button variant="outline" onClick={() => router.push('/crm/contacts')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Contacts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 rounded-lg hover:bg-secondary/80"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl">
                {contact.firstName} {contact.lastName}
              </h1>
              <Badge
                variant={contact.status === 'active' ? 'success' : 'secondary'}
                className="mt-1"
              >
                {contact.status}
              </Badge>
            </div>
            {contact.jobTitle && (
              <p className="text-muted-foreground mt-1">{contact.jobTitle}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
          onClick={() => deleteMutation.mutate()}
          disabled={deleteMutation.isPending}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Detail Card */}
        <Card className="lg:col-span-2" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary fields grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div
                className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in"
                style={{ animationDelay: '100ms' }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <Mail className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Email
                  </p>
                  <p className="text-sm font-medium truncate">
                    {contact.email || (
                      <span className="text-muted-foreground/60 font-normal">Not provided</span>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in"
                style={{ animationDelay: '150ms' }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Phone className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Phone
                  </p>
                  <p className="text-sm font-medium truncate">
                    {contact.phone || (
                      <span className="text-muted-foreground/60 font-normal">Not provided</span>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="flex items-start gap-3 rounded-lg bg-secondary/30 p-4 transition-colors hover:bg-secondary/50 animate-fade-in"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Briefcase className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Job Title
                  </p>
                  <p className="text-sm font-medium truncate">
                    {contact.jobTitle || (
                      <span className="text-muted-foreground/60 font-normal">Not provided</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {contact.tags?.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tags
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {contact.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-violet-500/20 bg-violet-500/10 text-violet-400"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {contact.customData && (
              <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                <CustomFieldsDisplay entityType="crm_contact" values={contact.customData} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notes Card */}
          <Card className="animate-fade-in" style={{ animationDelay: '160ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
              <Badge variant="secondary" className="font-sans text-2xs">
                {notes?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {notes?.length ? (
                <div className="space-y-0">
                  {notes.map((note: any, i: number) => (
                    <div
                      key={note.id}
                      className="border-b border-border/30 py-3 first:pt-0 last:border-0 last:pb-0 animate-fade-in"
                      style={{ animationDelay: `${(i + 1) * 60}ms` }}
                    >
                      <p className="text-sm leading-relaxed">{note.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {new Date(note.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary mb-3">
                    <FileText className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notes yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Notes added to this contact will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activities Card */}
          <Card className="animate-fade-in" style={{ animationDelay: '240ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Activities</CardTitle>
              <Badge variant="secondary" className="font-sans text-2xs">
                {activities?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              {activities?.length ? (
                <div className="space-y-0">
                  {activities.map((act: any, i: number) => (
                    <div
                      key={act.id}
                      className="border-b border-border/30 py-3 first:pt-0 last:border-0 last:pb-0 animate-fade-in"
                      style={{ animationDelay: `${(i + 1) * 60}ms` }}
                    >
                      <p className="text-sm font-medium">{act.title}</p>
                      <Badge
                        variant="outline"
                        className="mt-1.5 border-blue-500/20 bg-blue-500/10 text-blue-400"
                      >
                        {act.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary mb-3">
                    <Activity className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">No activities yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Activity with this contact will be tracked here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
