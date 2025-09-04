'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, X, Plus } from 'lucide-react';

import InsurersTable, { InsurerRow } from './InsurersTable';
import InsurerFormDialog, { InsuranceLine } from './InsurerFormDialog';

// ---------- tipos ----------
type PageResult<T> = { items: T[]; page: number; limit: number; total: number };

const InsuranceLineSchema = z.enum(['HEALTH', 'DENTAL', 'LIFE', 'P_AND_C', 'OTHER']);
type LineFilter = z.infer<typeof InsuranceLineSchema>;

// ---------- utils ----------
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

// ---------- página ----------
export default function InsurersPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // URL state
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const q = searchParams.get('q') ?? '';
  const line = (searchParams.get('line') as LineFilter | null) ?? null;

  // busca com debounce
  const [searchText, setSearchText] = React.useState(q);
  const debouncedQ = useDebounced(searchText);

  const pushParams = (updates: Record<string, string | number | null | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') p.delete(k);
      else p.set(k, String(v));
    });
    router.push(`?${p.toString()}`);
  };

  React.useEffect(() => {
    if (debouncedQ !== q) pushParams({ q: debouncedQ || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // enums de lines
  const linesQuery = useQuery({
    queryKey: ['insurers', 'lines'],
    queryFn: async () => apiFetch<{ lines: InsuranceLine[] }>('/insurers/lines'),
    staleTime: 60_000,
  });
  const linesEnum = linesQuery.data?.lines ?? ['HEALTH', 'DENTAL', 'LIFE', 'P_AND_C', 'OTHER'];

  // listagem
  const listQuery = useQuery<PageResult<InsurerRow>>({
    queryKey: ['insurers', { page, limit, q, line }],
    queryFn: async () => {
      const res = await apiFetch<PageResult<InsurerRow>>('/insurers', {
        query: {
          page,
          limit,
          search: q || undefined,
          line: line || undefined,
        },
      });
      if (!res || !Array.isArray(res.items)) throw new Error('Resposta inválida da API de seguradoras.');
      return res;
    },
    staleTime: 10_000,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? items.length;
  const currentPage = listQuery.data?.page ?? page;
  const currentLimit = listQuery.data?.limit ?? limit;
  const totalPages = Math.max(1, Math.ceil((total || 1) / (currentLimit || 10)));

  // dialog de formulário
  const [openForm, setOpenForm] = React.useState(false);
  const [formMode, setFormMode] = React.useState<'create' | 'edit'>('create');
  const [editing, setEditing] = React.useState<InsurerRow | null>(null);

  // confirmação de delete
  const [confirmDelete, setConfirmDelete] = React.useState<InsurerRow | null>(null);

  const toggleActive = useMutation({
    mutationFn: async (row: InsurerRow) =>
      apiFetch(`/insurers/${encodeURIComponent(row.id)}/toggle-active`, { method: 'PATCH' }),
    onSuccess: () => {
      toast.success('Status atualizado.');
      qc.invalidateQueries({ queryKey: ['insurers'] });
    },
    onError: (e) => toast.error('Falha ao atualizar status.', { description: errorMessage(e) }),
  });

  const removeOne = useMutation({
    mutationFn: async (row: InsurerRow) =>
      apiFetch(`/insurers/${encodeURIComponent(row.id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Seguradora excluída.');
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['insurers'] });
    },
    onError: (e) => toast.error('Falha ao excluir seguradora.', { description: errorMessage(e) }),
  });

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
                  <BreadcrumbLink href="/insurers">Seguradoras</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Lista</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 pt-0">
          <div className="rounded-xl bg-muted/50 p-6">
            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="w-[260px] pl-8"
                    placeholder="Buscar por nome, slug…"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                {q && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchText('');
                      pushParams({ q: undefined, page: 1 });
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Limpar busca</span>
                  </Button>
                )}

                {/* Filtro por linha */}
                <Select
                  value={line ?? 'ALL'}
                  onValueChange={(v) => pushParams({ line: v === 'ALL' ? undefined : v, page: 1 })}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Linha (todas)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    {linesEnum.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setFormMode('create');
                    setEditing(null);
                    setOpenForm(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Seguradora
                </Button>
              </div>
            </div>

            {/* Card de listagem */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Seguradoras</CardTitle>
                <p className="text-sm text-muted-foreground">{total} registro(s).</p>
              </CardHeader>
              <CardContent>
                {listQuery.isFetching && !listQuery.data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : listQuery.isError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">Erro ao carregar seguradoras.</p>
                    <p className="break-all text-xs text-muted-foreground">{errorMessage(listQuery.error)}</p>
                    <Button variant="outline" size="sm" onClick={() => listQuery.refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <InsurersTable
                      items={items}
                      onEdit={(row) => {
                        setFormMode('edit');
                        setEditing(row);
                        setOpenForm(true);
                      }}
                      onToggleActive={(row) => toggleActive.mutate(row)}
                      onDelete={(row) => setConfirmDelete(row)}
                    />

                    {/* paginação */}
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pushParams({ page: 1 })}
                        disabled={currentPage <= 1}
                      >
                        {'<<'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pushParams({ page: Math.max(1, currentPage - 1) })}
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pushParams({ page: Math.min(totalPages, currentPage + 1) })}
                        disabled={currentPage >= totalPages}
                      >
                        Próxima
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pushParams({ page: totalPages })}
                        disabled={currentPage >= totalPages}
                      >
                        {'>>'}
                      </Button>

                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Por página</span>
                        <Select
                          value={String(currentLimit)}
                          onValueChange={(v) => pushParams({ limit: Number(v), page: 1 })}
                        >
                          <SelectTrigger className="w-20" aria-label="Linhas por página">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((ps) => (
                              <SelectItem key={ps} value={`${ps}`}>{ps}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Dialog de form (criar/editar) */}
      <InsurerFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        mode={formMode}
        initial={
          editing
            ? {
                id: editing.id,
                slug: editing.slug,
                legalName: editing.legalName,
                tradeName: editing.tradeName,
                website: editing.website ?? '',
                lines: editing.lines as InsuranceLine[],
                isActive: editing.isActive,
                expectedUpdatedAt: editing.updatedAt,
              }
            : undefined
        }
        linesEnum={linesEnum as InsuranceLine[]}
      />

      {/* Confirmar exclusão */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !removeOne.isPending && setConfirmDelete(o ? confirmDelete : null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir seguradora</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
              {confirmDelete ? (
                <>
                  <br />
                  <span className="font-medium">"{confirmDelete.tradeName}"</span> será removida.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeOne.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={removeOne.isPending}
              onClick={() => confirmDelete && removeOne.mutate(confirmDelete)}
            >
              {removeOne.isPending ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
