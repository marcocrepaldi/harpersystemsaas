'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import ClientForm, { type ClientPayload } from '../_components/client-form';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

/* ----------------------------- Tipos do backend ----------------------------- */
type PersonTypeDto = 'PF' | 'PJ';
type ClientStatusDto = 'lead' | 'prospect' | 'active' | 'inactive';

type AddressDto = {
  zip?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type PrimaryContactDto = {
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

type ClientFromApi = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  birthDate?: string | null;
  personType: PersonTypeDto;
  status: ClientStatusDto;
  notes?: string | null;

  address?: AddressDto;
  primaryContact?: PrimaryContactDto;

  // PF
  pfRg?: string | null;
  pfMaritalStatus?: string | null;
  pfProfession?: string | null;
  pfIsPEP?: boolean | null;

  // PJ
  pjCorporateName?: string | null;
  pjTradeName?: string | null;
  pjCnpj?: string | null;
  pjStateRegistration?: string | null;
  pjMunicipalRegistration?: string | null;
  pjCNAE?: string | null;
  pjFoundationDate?: string | null;
  pjRepName?: string | null;
  pjRepCpf?: string | null;
  pjRepEmail?: string | null;
  pjRepPhone?: string | null;

  // normalizações
  serviceSlugs?: string[];
  tagSlugs?: string[];
  tags?: string[] | null;

  deletedAt?: string | null;
};

function undef<T>(v: T | null | undefined): T | undefined {
  return v == null ? undefined : (v as T);
}

/** Converte o payload da API para o formato inicial esperado pelo ClientForm */
function toInitialValues(api: ClientFromApi): Partial<ClientPayload> {
  return {
    personType: api.personType || 'PF',
    status: api.status || 'active',

    name: api.name,
    document: undef(api.document),
    email: undef(api.email),
    phone: undef(api.phone),
    notes: undef(api.notes),

    // PF (somente se vier algo)
    pf: (api.pfRg || api.pfMaritalStatus || api.pfProfession || typeof api.pfIsPEP === 'boolean')
      ? {
          rg: undef(api.pfRg),
          maritalStatus: undef(api.pfMaritalStatus),
          profession: undef(api.pfProfession),
          isPEP: typeof api.pfIsPEP === 'boolean' ? api.pfIsPEP : undefined,
          birthDate: undef(api.birthDate),
        }
      : undefined,

    // PJ
    pj: (api.pjCorporateName || api.pjTradeName || api.pjCnpj || api.pjCNAE || api.pjFoundationDate || api.pjRepName)
      ? {
          corporateName: undef(api.pjCorporateName),
          tradeName: undef(api.pjTradeName),
          cnpj: undef(api.pjCnpj),
          stateRegistration: undef(api.pjStateRegistration),
          municipalRegistration: undef(api.pjMunicipalRegistration),
          cnae: undef(api.pjCNAE),
          foundationDate: undef(api.pjFoundationDate),
          legalRepresentative: (api.pjRepName || api.pjRepCpf || api.pjRepEmail || api.pjRepPhone)
            ? {
                name: undef(api.pjRepName),
                cpf: undef(api.pjRepCpf),
                email: undef(api.pjRepEmail),
                phone: undef(api.pjRepPhone),
              }
            : undefined,
        }
      : undefined,

    // aninhados
    address: {
      zip: undef(api.address?.zip),
      street: undef(api.address?.street),
      number: undef(api.address?.number),
      complement: undef(api.address?.complement),
      district: undef(api.address?.district),
      city: undef(api.address?.city),
      state: undef(api.address?.state),
      country: undef(api.address?.country),
    },
    primaryContact: (api.primaryContact &&
      (api.primaryContact.name || api.primaryContact.email || api.primaryContact.phone || api.primaryContact.role || api.primaryContact.notes))
      ? {
          name: undef(api.primaryContact.name),
          role: undef(api.primaryContact.role),
          email: undef(api.primaryContact.email),
          phone: undef(api.primaryContact.phone),
          notes: undef(api.primaryContact.notes),
        }
      : undefined,

    // relações normalizadas
    serviceSlugs: api.serviceSlugs ?? undefined,
    tags: api.tagSlugs ?? api.tags ?? undefined,
  };
}

export default function ClientEditPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <Skeleton className="mb-3 h-6 w-48" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <ClientEditPageInner />
    </Suspense>
  );
}

function ClientEditPageInner(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) ?? '';

  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [client, setClient] = React.useState<ClientFromApi | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      if (!id) return;
      setLoading(true);
      try {
        const data = await apiFetch<ClientFromApi>(`/clients/${encodeURIComponent(id)}`, {
          query: { includeRels: 'true' },
        });
        if (mounted) setClient(data);
      } catch (e: unknown) {
        toast.error(errorMessage(e) || 'Erro ao carregar cliente.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function handleDelete(): Promise<void> {
    if (!id) return;
    const ok = typeof window !== 'undefined' && window.confirm('Excluir este cliente? Essa ação não pode ser desfeita.');
    if (!ok) return;
    setSaving(true);
    try {
      await apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast.success('Cliente excluído.');
      router.replace(`/clients${qs}`);
      setTimeout(() => router.refresh(), 50);
    } catch (e: unknown) {
      toast.error(errorMessage(e) || 'Erro ao excluir cliente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore(): Promise<void> {
    if (!id) return;
    setSaving(true);
    try {
      await apiFetch<void>(`/clients/${encodeURIComponent(id)}/restore`, { method: 'POST' });
      toast.success('Cliente restaurado.');
      setTimeout(() => router.refresh(), 50);
    } catch (e: unknown) {
      toast.error(errorMessage(e) || 'Erro ao restaurar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/clients${qs}`}>Clientes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Editar</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex gap-2 px-4">
            <Button variant="outline" onClick={() => router.push(`/clients${qs}`)}>
              Voltar
            </Button>
            <Button
              variant={client?.deletedAt ? 'default' : 'destructive'}
              onClick={() => (client?.deletedAt ? void handleRestore() : void handleDelete())}
              disabled={saving || loading}
            >
              {saving ? (client?.deletedAt ? 'Restaurando...' : 'Excluindo...') : client?.deletedAt ? 'Restaurar' : 'Excluir'}
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 pt-0">
          <div className="rounded-xl bg-muted/50 p-6">
            <Card className="border-none shadow-none">
              <CardContent className="px-0">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-72 w-full" />
                  </div>
                ) : client ? (
                  <ClientForm
                    mode="edit"
                    id={id}
                    title={client.deletedAt ? 'Editar Cliente (Excluído)' : 'Editar Cliente'}
                    initialValues={toInitialValues(client)}
                    onSuccessRedirect={`/clients${qs}`}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}