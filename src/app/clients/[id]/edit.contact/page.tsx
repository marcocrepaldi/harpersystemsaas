'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatPhoneBR, normalizePhone, isEmail } from '@/lib/format';

type ContactFromApi = {
  id: string;
  clientId: string;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  isPrimary: boolean;
};

type ClientWithContacts = {
  id: string;
  contacts?: ContactFromApi[];
};

export default function EditContactPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const clientId = (params?.id as string) ?? '';
  const contactId = search.get('contactId');
  const next = search.get('next') || `/clients/${clientId}`;

  const isEdit = Boolean(contactId);

  const [loading, setLoading] = React.useState<boolean>(!!contactId);
  const [saving, setSaving] = React.useState<boolean>(false);

  const [name, setName] = React.useState<string>('');
  const [role, setRole] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [phone, setPhone] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');
  const [isPrimary, setIsPrimary] = React.useState<boolean>(false);

  React.useEffect(() => {
    let mounted = true;
    async function loadContact(): Promise<void> {
      if (!clientId || !contactId) return;
      setLoading(true);
      try {
        const client = await apiFetch<ClientWithContacts>(`/clients/${encodeURIComponent(clientId)}`, {
          query: { includeRels: true },
        });
        const found = client.contacts?.find((c) => c.id === contactId);
        if (!found) {
          toast.error('Contato não encontrado.');
          router.replace(next);
          return;
        }
        if (!mounted) return;

        setName(found.name || '');
        setRole(found.role || '');
        setEmail(found.email || '');
        setPhone(found.phone || '');
        setNotes(found.notes || '');
        setIsPrimary(Boolean(found.isPrimary));
      } catch (e) {
        toast.error(errorMessage(e) || 'Falha ao carregar contato.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadContact();
    return () => {
      mounted = false;
    };
  }, [clientId, contactId, router, next]);

  function validate(): string | null {
    if (!name.trim()) return 'Nome do contato é obrigatório.';
    const hasEmail = !!email.trim();
    const normPhone = normalizePhone(phone);
    if (!hasEmail && !normPhone) {
      return 'Informe ao menos um meio de contato (e-mail ou telefone).';
    }
    if (hasEmail && !isEmail(email)) {
      return 'E-mail inválido.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      role: role.trim() || undefined,
      email: email.trim() || undefined,
      phone: normalizePhone(phone) || undefined,
      notes: notes.trim() || undefined,
      isPrimary,
    };
    try {
      if (isEdit) {
        await apiFetch<void>(
          `/clients/${encodeURIComponent(clientId)}/contacts/${encodeURIComponent(contactId!)}`,
          { method: 'PATCH', body: payload },
        );
        toast.success('Contato atualizado com sucesso.');
      } else {
        await apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/contacts`, {
          method: 'POST',
          body: payload,
        });
        toast.success('Contato criado com sucesso.');
      }
      router.replace(next);
      setTimeout(() => router.refresh(), 50);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha ao salvar contato.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!isEdit || !contactId) return;
    const ok = typeof window !== 'undefined' && window.confirm('Excluir este contato? Essa ação não pode ser desfeita.');
    if (!ok) return;

    setSaving(true);
    try {
      await apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/contacts/${encodeURIComponent(contactId)}`, {
        method: 'DELETE',
      });
      toast.success('Contato excluído.');
      router.replace(next);
      setTimeout(() => router.refresh(), 50);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha ao excluir contato.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-3 h-6 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Editar contato' : 'Novo contato'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Cargo/Setor</Label>
                <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={saving}
                  placeholder="contato@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formatPhoneBR(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} rows={4} />
            </div>

            <div className="flex items-center gap-3">
              <Switch id="isPrimary" checked={isPrimary} onCheckedChange={setIsPrimary} disabled={saving} />
              <Label htmlFor="isPrimary">Contato principal</Label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar contato'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.replace(next)} disabled={saving}>
                Cancelar
              </Button>
              {isEdit && (
                <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
                  Excluir
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
