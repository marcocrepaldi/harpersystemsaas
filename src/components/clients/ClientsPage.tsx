'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { toast } from 'sonner';
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
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { SlidersHorizontal, Search, X, Trash2, Download } from 'lucide-react';
import ClientsTable from './ClientsTable';
import { toCSV, downloadBlob } from '@/lib/clients/csv';

// ---------------- types & schemas ----------------
type PageResult<T> = { items: T[]; page: number; limit: number; total: number };

const StatusSchema = z.enum(['LEAD', 'PROSPECT', 'ACTIVE', 'INACTIVE']);
export type Status = z.infer<typeof StatusSchema>;
export type PersonType = 'PF' | 'PJ';

export type ClientRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  personType?: PersonType | null;
  status?: Status | null;
  cityUf?: string | null;
};

// ---------------- local keys ----------------
const COLS_LS_KEY = 'clients.columns.v1';

// ---------------- utils ----------------
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

// ---------------- component ----------------
export default function ClientsPage(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // URL state
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const q = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') as Status | null) ?? null;
  const personType = (searchParams.get('type') as PersonType | null) ?? null;

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

  // sync debounced search → URL
  React.useEffect(() => {
    if (debouncedQ !== q) pushParams({ q: debouncedQ || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  // visible columns (persist)
  const [colVisibility, setColVisibility] = React.useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      if (raw) return JSON.parse(raw) as Record<string, boolean>;
    } catch {}
    return {
      select: true,
      name: true,
      email: true,
      phone: true,
      document: true,
      personType: true,
      status: true,
      cityUf: false,
      actions: true,
    };
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(COLS_LS_KEY, JSON.stringify(colVisibility));
    } catch {}
  }, [colVisibility]);

  // data
  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<ClientRow>>({
    queryKey: ['clients', { page, limit, q, status, personType }],
    queryFn: async () => {
      const res = await apiFetch<PageResult<ClientRow> | ClientRow[]>('/clients', {
        query: {
          page,
          limit,
          search: q || undefined,
          status: status || undefined,
          personType: personType || undefined,
        },
      });
      if (Array.isArray(res)) return { items: res, page, limit, total: res.length };
      if (res && Array.isArray((res as PageResult<ClientRow>).items)) return res as PageResult<ClientRow>;
      throw new Error('Resposta inválida da API de clientes.');
    },
    staleTime: 10_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? items.length;
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const totalPages = Math.max(1, Math.ceil((total || 1) / (currentLimit || 10)));

  // seleção & bulk delete
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = React.useState(false);

  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) =>
      Promise.all(ids.map((id) => apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' }))),
    onSuccess: () => {
      toast.success('Clientes removidos.');
      setSelectedIds([]);
      qc.invalidateQueries({ queryKey: ['clients'] });
      setConfirmBulk(false);
    },
    onError: (e) => toast.error('Falha ao remover clientes.', { description: errorMessage(e) }),
  });

  // mantém seleção apenas na página atual
  React.useEffect(() => {
    if (!items.length && selectedIds.length === 0) return;
    const idsOnPage = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => idsOnPage.has(id)));
  }, [items, selectedIds.length]);

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
                  <BreadcrumbLink href="/clients">Clientes</BreadcrumbLink>
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
                    placeholder="Buscar por nome, email…"
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

                {/* Filtro: Status (usar sentinela 'ALL' no value) */}
                <Select
                  value={status ?? 'ALL'}
                  onValueChange={(v) => pushParams({ status: v === 'ALL' ? undefined : v, page: 1 })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status (todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="PROSPECT">Prospect</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro: Tipo PF/PJ (sentinela 'ALL') */}
                <Select
                  value={personType ?? 'ALL'}
                  onValueChange={(v) => pushParams({ type: v === 'ALL' ? undefined : v, page: 1 })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo (todos)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="PJ">PJ</SelectItem>
                  </SelectContent>
                </Select>

                {/* Excluir em massa */}
                <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.length === 0}
                    onClick={() => setConfirmBulk(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir ({selectedIds.length})
                  </Button>

                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir clientes selecionados</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. {selectedIds.length} registro(s) serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteMany.isPending}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteMany.isPending}
                        onClick={() => deleteMany.mutate(selectedIds)}
                      >
                        {deleteMany.isPending ? 'Excluindo…' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Export CSV (página atual) */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const csv = toCSV(items);
                    downloadBlob(`clientes_p${currentPage}.csv`, csv);
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={() => router.push(`/clients/new?${searchParams.toString()}`)}>
                  Novo Cliente
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Colunas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(colVisibility).map(([key, visible]) => (
                      <DropdownMenuCheckboxItem
                        key={key}
                        checked={!!visible}
                        onCheckedChange={(v) =>
                          setColVisibility((prev) => ({ ...prev, [key]: !!v }))
                        }
                        disabled={key === 'select' || key === 'actions'}
                      >
                        {key === 'cityUf' ? 'Cidade/UF'
                          : key === 'personType' ? 'Tipo'
                          : key === 'document' ? 'Documento'
                          : key === 'select' ? 'Selecionar'
                          : key === 'actions' ? 'Ações'
                          : key}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clientes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {total} registro(s){status ? ` • Status: ${status}` : ''}{personType ? ` • Tipo: ${personType}` : ''}.
                </p>
              </CardHeader>
              <CardContent>
                {isFetching && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : isError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">Erro ao carregar clientes.</p>
                    <p className="break-all text-xs text-muted-foreground">{errorMessage(error)}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <ClientsTable
                      items={items}
                      colVisibility={colVisibility}
                      onColVisibilityChange={setColVisibility}
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                    />

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
    </SidebarProvider>
  );
}
