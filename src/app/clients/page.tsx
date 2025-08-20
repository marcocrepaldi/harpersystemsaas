'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { MoreVertical, SlidersHorizontal, Search, X } from 'lucide-react';

type PageResult<T> = { items: T[]; page: number; limit: number; total: number };
type ClientRow = { id: string; name: string; email?: string | null; phone?: string | null; document?: string | null };

type ColumnKey = 'select' | 'name' | 'email' | 'phone' | 'document' | 'actions';
const ALL_COLUMNS: { key: ColumnKey; label: string; default?: boolean }[] = [
  { key: 'select', label: '', default: true },
  { key: 'name', label: 'Nome', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'phone', label: 'Telefone', default: true },
  { key: 'document', label: 'Documento', default: true },
  { key: 'actions', label: 'Ações', default: true },
];
const COLS_LS_KEY = 'clients.visibleColumns';

function RowActions({ id }: { id: string }): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const del = useMutation({
    mutationFn: async () => apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Cliente removido.');
      qc.invalidateQueries({ queryKey: ['clients'] });
      setConfirmOpen(false);
    },
    onError: (e: unknown) => toast.error('Falha ao remover cliente.', { description: errorMessage(e) }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => router.push(`/clients/${encodeURIComponent(id)}${qs}`)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info('Make a copy: pendente de endpoint.')}>
            Make a copy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.success('Favoritado')}>
            Favorite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={del.isPending}
              onClick={() => del.mutate()}
            >
              {del.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ClientsPage(): React.ReactElement {
  return (
    <Suspense
      fallback={(
        <div className="p-4">
          <Skeleton className="mb-3 h-6 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}
    >
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ? `?${searchParams.toString()}` : '';

  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const search = searchParams.get('search') ?? '';

  const [searchText, setSearchText] = React.useState(search);

  const [visibleCols, setVisibleCols] = React.useState<Set<ColumnKey>>(() => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      if (raw) return new Set(JSON.parse(raw) as ColumnKey[]);
    } catch {
      // ignore
    }
    return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key));
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(COLS_LS_KEY, JSON.stringify([...visibleCols]));
    } catch {
      // ignore
    }
  }, [visibleCols]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<ClientRow>>({
    queryKey: ['clients', { page, limit, search }],
    queryFn: async () => {
      const res = await apiFetch<PageResult<ClientRow> | ClientRow[]>('/clients', {
        query: { page, limit, search: search || undefined },
      });

      if (Array.isArray(res)) {
        return { items: res, page, limit, total: res.length };
      }
      if (res && Array.isArray((res as PageResult<ClientRow>).items)) {
        return res as PageResult<ClientRow>;
      }
      throw new Error('Resposta inválida da API de clientes.');
    },
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const items: ClientRow[] = React.useMemo(() => data?.items ?? [], [data]);
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil((total || 1) / (currentLimit || 10)));

  React.useEffect(() => {
    if (!items.length && selected.size === 0) return;
    const idsOnPage = new Set(items.map((i) => i.id));
    setSelected((prev) => new Set([...prev].filter((id) => idsOnPage.has(id))));
  }, [items, selected.size]);

  const qc = useQueryClient();
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' })));
    },
    onSuccess: () => {
      toast.success('Clientes removidos.');
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ['clients'] });
      setBulkOpen(false);
    },
    onError: (e: unknown) => toast.error('Falha ao remover clientes.', { description: errorMessage(e) }),
  });

  const pushParams = (updates: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') p.delete(k);
      else p.set(k, String(v));
    });
    router.push(`?${p.toString()}`);
  };
  const setPage = (next: number) => pushParams({ page: Math.max(1, next) });
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushParams({ search: searchText || undefined, page: 1 });
  };

  const isVisible = (key: ColumnKey) => visibleCols.has(key);
  const toggleCol = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        const nonSelectVisible = [...next].filter((k) => k !== 'select').length;
        if (nonSelectVisible <= 1 && key !== 'select') return next;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const idsThisPage = React.useMemo(() => items.map((i) => i.id), [items]);
  const allSelected = idsThisPage.length > 0 && idsThisPage.every((id) => selected.has(id));
  const toggleSelectAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) idsThisPage.forEach((id) => next.add(id));
      else idsThisPage.forEach((id) => next.delete(id));
      return next;
    });
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

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
              <div className="flex items-center gap-2">
                <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="w-[260px] pl-8"
                      placeholder="Buscar por nome, email..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="secondary" size="sm">Buscar</Button>
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSearchText('');
                        pushParams({ search: undefined, page: 1 });
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Limpar busca</span>
                    </Button>
                  )}
                </form>

                <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={selected.size === 0}>
                      Excluir ({selected.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir clientes selecionados</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. {selected.size} registro(s) serão removidos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteMany.isPending}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleteMany.isPending}
                        onClick={() => deleteMany.mutate([...selected])}
                      >
                        {deleteMany.isPending ? 'Excluindo...' : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link href={`/clients/new${qs}`}>Novo Cliente</Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Customize Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_COLUMNS.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={visibleCols.has(c.key)}
                        onCheckedChange={() => toggleCol(c.key)}
                        disabled={c.key === 'select'}
                      >
                        {c.label || c.key}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clientes</CardTitle>
                <p className="text-sm text-muted-foreground">Lista do tenant atual.</p>
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
                    <p className="break-all text-xs text-muted-foreground">
                      {errorMessage(error)}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {isVisible('select') && (
                              <TableHead className="w-10">
                                <Checkbox
                                  checked={allSelected}
                                  onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
                                  aria-label="Selecionar todos"
                                />
                              </TableHead>
                            )}
                            {isVisible('name') && <TableHead className="w-[28%]">Nome</TableHead>}
                            {isVisible('email') && <TableHead>Email</TableHead>}
                            {isVisible('phone') && <TableHead>Telefone</TableHead>}
                            {isVisible('document') && <TableHead>Documento</TableHead>}
                            {isVisible('actions') && <TableHead className="text-right">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((c) => {
                            const checked = selected.has(c.id);
                            return (
                              <TableRow
                                key={c.id}
                                className="cursor-pointer hover:bg-accent/50 even:bg-muted/30"
                                onClick={() => router.push(`/clients/${encodeURIComponent(c.id)}${qs}`)}
                              >
                                {isVisible('select') && (
                                  <TableCell onClick={(e) => e.stopPropagation()} className="w-10">
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) => toggleOne(c.id, Boolean(v))}
                                      aria-label={`Selecionar ${c.name}`}
                                    />
                                  </TableCell>
                                )}
                                {isVisible('name') && <TableCell className="font-medium">{c.name}</TableCell>}
                                {isVisible('email') && <TableCell>{c.email ?? '—'}</TableCell>}
                                {isVisible('phone') && <TableCell>{c.phone ?? '—'}</TableCell>}
                                {isVisible('document') && <TableCell>{c.document ?? '—'}</TableCell>}
                                {isVisible('actions') && (
                                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <RowActions id={c.id} />
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Próxima
                      </Button>
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
