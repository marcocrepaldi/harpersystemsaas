'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Protected } from '@/components/auth/protected';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

type HealthPlan = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isFetching, isError, error } = useQuery<HealthPlan>({
    queryKey: ['health-plan', planId],
    queryFn: () => apiFetch<HealthPlan>(`/health/plans/${planId}`),
    staleTime: 5_000,
  });

  const [name, setName] = React.useState('');
  const [isActive, setIsActive] = React.useState<boolean>(true);

  // para saber se houve alteração
  const isDirty = React.useMemo(() => {
    if (!data) return false;
    return data.name !== name || Boolean(data.isActive) !== isActive;
  }, [data, name, isActive]);

  React.useEffect(() => {
    if (data) {
      setName(data.name);
      setIsActive(Boolean(data.isActive));
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: async () =>
      apiFetch(`/health/plans/${planId}`, {
        method: 'PATCH',
        body: { name, isActive },
      }),
    onSuccess: () => {
      toast.success('Plano atualizado.');
      qc.invalidateQueries({ queryKey: ['health-plan', planId] });
      qc.invalidateQueries({ queryKey: ['health-plans'] });
    },
    onError: (e) =>
      toast.error('Falha ao atualizar.', { description: errorMessage(e) }),
  });

  const deleteMut = useMutation({
    mutationFn: async () => apiFetch(`/health/plans/${planId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Plano excluído.');
      qc.invalidateQueries({ queryKey: ['health-plans'] });
      router.push('/health/plans');
    },
    onError: (e) =>
      toast.error('Falha ao excluir.', { description: errorMessage(e) }),
  });

  const canSave = data && name.trim().length > 2 && isDirty && !updateMut.isPending;

  return (
    <Protected>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />

          <div className="px-4 pt-2 md:px-6 md:pt-4">
            <div className="mb-4 flex items-center justify-between">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/health">Saúde</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/health/plans">Planos</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Editar plano</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/health/plans">Voltar</Link>
                </Button>
              </div>
            </div>

            {isFetching && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : isError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">Erro ao carregar plano.</p>
                <p className="text-xs text-muted-foreground break-all">
                  {errorMessage(error)}
                </p>
                <Button variant="outline" onClick={() => location.reload()}>
                  Recarregar
                </Button>
              </div>
            ) : data ? (
              <div className="grid gap-6 max-w-3xl">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Identificação</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Slug</Label>
                      <Input value={data.slug} disabled />
                      <p className="text-xs text-muted-foreground">
                        Slug não pode ser alterado.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex.: Plano Ouro"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant={isActive ? 'default' : 'outline'}
                          onClick={() => setIsActive(true)}
                          size="sm"
                        >
                          Ativo
                        </Button>
                        <Button
                          type="button"
                          variant={!isActive ? 'default' : 'outline'}
                          onClick={() => setIsActive(false)}
                          size="sm"
                        >
                          Inativo
                        </Button>
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className="ml-2"
                        >
                          {isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Separator className="my-2" />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateMut.mutate()}
                          disabled={!canSave}
                        >
                          {updateMut.isPending ? 'Salvando…' : 'Salvar alterações'}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              disabled={deleteMut.isPending}
                            >
                              {deleteMut.isPending ? 'Excluindo…' : 'Excluir plano'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir este plano?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é permanente. Relações como aliases, preços
                                e vínculos com clientes poderão ser removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMut.mutate()}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Confirmar exclusão
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {!isDirty && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Nenhuma alteração pendente.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
