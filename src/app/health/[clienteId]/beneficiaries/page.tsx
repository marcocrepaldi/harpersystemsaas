"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

// Layout
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Ícones
import { MoreVertical, SlidersHorizontal, Search, X, Upload, PlusCircle, Loader2 } from "lucide-react";

// ---------- Tipos ----------
type PageResult<T> = { items: T[]; page: number; limit: number; total: number };

// ✅ TIPO ATUALIZADO com todos os novos campos
type BeneficiaryRow = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;
  tipo: "Titular" | "Dependente";
  valorMensalidade?: number | null;
  status: "Ativo" | "Inativo";
  titularId?: string | null;
  matricula?: string | null;
  carteirinha?: string | null;
  sexo?: string | null;
  dataNascimento?: string | null;
  plano?: string | null;
  centroCusto?: string | null;
};

type UploadResult = {
  created: number;
  updated: number;
  errors: any[];
  total: number;
}

// ✅ LISTA DE COLUNAS ATUALIZADA
type ColumnKey =
  | "select"
  | "nomeCompleto"
  | "cpf"
  | "tipo"
  | "plano"
  | "matricula"
  | "valorMensalidade"
  | "status"
  | "actions";

const ALL_COLUMNS: { key: ColumnKey; label: string; default?: boolean }[] = [
  { key: "select", label: "", default: true },
  { key: "nomeCompleto", label: "Nome", default: true },
  { key: "cpf", label: "CPF", default: true },
  { key: "tipo", label: "Tipo", default: true },
  { key: "plano", label: "Plano", default: true },
  { key: "matricula", label: "Matrícula", default: false }, // Por padrão, escondido
  { key: "valorMensalidade", label: "Mensalidade (R$)", default: true },
  { key: "status", label: "Status", default: true },
  { key: "actions", label: "Ações", default: true },
];

const COLS_LS_KEY = "health.beneficiaries.visibleColumns";

// ---------- Ações por linha ----------
function RowActions({ id, clienteId }: { id: string; clienteId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const del = useMutation({
    mutationFn: async () =>
      apiFetch<void>(
        `/clients/${encodeURIComponent(clienteId)}/beneficiaries/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      toast.success("Beneficiário removido.");
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      setConfirmOpen(false);
    },
    onError: (e: unknown) =>
      toast.error("Falha ao remover beneficiário.", { description: errorMessage(e) }),
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
          <DropdownMenuItem onClick={() => router.push(`/health/${encodeURIComponent(clienteId)}/beneficiaries/${encodeURIComponent(id)}${qs}`)}>
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmOpen(true)}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir beneficiário</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={del.isPending}
              onClick={() => del.mutate()}
            >
              {del.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Wrapper exigido pelo Next quando usamos useSearchParams em Client Page */
export default function BeneficiariesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <Skeleton className="h-6 w-40 mb-3" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <BeneficiariesPageInner />
    </Suspense>
  );
}

// ---------- Página (conteúdo real) ----------
function BeneficiariesPageInner() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const qc = useQueryClient();

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const search = searchParams.get("search") ?? "";
  
  const [searchText, setSearchText] = React.useState(search);
  const [visibleCols, setVisibleCols] = React.useState<Set<ColumnKey>>(() => {
    try {
      const raw = localStorage.getItem(COLS_LS_KEY);
      if (raw) return new Set(JSON.parse(raw) as ColumnKey[]);
    } catch {}
    return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key));
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(COLS_LS_KEY, JSON.stringify([...visibleCols]));
    } catch {}
  }, [visibleCols]);
  
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [errorDetails, setErrorDetails] = React.useState<any[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<UploadResult>(`/clients/${encodeURIComponent(clienteId)}/beneficiaries/upload`, {
        method: 'POST',
        body: formData,
      }),
    onSuccess: (data) => {
      const { created = 0, updated = 0, errors = [] } = data;
      
      if (errors.length > 0) {
        toast.warning(`Importação concluída com ${errors.length} erro(s).`, {
          description: `Criados: ${created}, Atualizados: ${updated}. Clique para ver os detalhes.`,
          duration: 10000,
          action: {
            label: 'Ver Detalhes',
            onClick: () => setErrorDetails(errors),
          }
        });
      } else {
        toast.success('Arquivo processado com sucesso!', {
          description: `Criados: ${created}, Atualizados: ${updated}.`,
        });
      }
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (e) => toast.error('Falha ao importar arquivo.', { description: errorMessage(e) }),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      uploadMutation.mutate(formData);
    }
    event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<BeneficiaryRow>>({
    queryKey: ["beneficiaries", { clienteId, page, limit, search }],
    queryFn: async () => {
      const res = await apiFetch<PageResult<BeneficiaryRow> | BeneficiaryRow[]>(
        `/clients/${encodeURIComponent(clienteId)}/beneficiaries`,
        { query: { page, limit, search: search || undefined } },
      );
      if (Array.isArray(res)) return { items: res, page, limit, total: res.length };
      if (res && Array.isArray((res as PageResult<BeneficiaryRow>).items)) return res;
      throw new Error("Resposta inválida da API de beneficiários.");
    },
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const items: BeneficiaryRow[] = React.useMemo(() => data?.items ?? [], [data]);
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil((total || 1) / (currentLimit || 10)));

  React.useEffect(() => {
    if (!items.length && selected.size === 0) return;
    const idsOnPage = new Set(items.map((i) => i.id));
    setSelected((prev) => new Set([...prev].filter((id) => idsOnPage.has(id))));
  }, [items, selected.size]);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) => {
      const deletePromises = ids.map((id) =>
        apiFetch<void>(
          `/clients/${encodeURIComponent(clienteId)}/beneficiaries/${encodeURIComponent(id)}`,
          { method: "DELETE" },
        )
      );
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      toast.success(`${selected.size} beneficiário(s) removido(s).`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      setBulkOpen(false);
    },
    onError: (e: unknown) =>
      toast.error("Falha ao remover beneficiários.", { description: errorMessage(e) }),
  });

  const pushParams = (updates: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") p.delete(k);
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
        const nonSelectVisible = [...next].filter((k) => k !== "select").length;
        if (nonSelectVisible <= 1 && key !== "select") return next;
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
                  <BreadcrumbLink href="/health">Rota de Saúde</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Beneficiários</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4 flex items-center gap-2">
            <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-[240px]"
                  placeholder="Buscar por nome ou CPF..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Buscar</Button>
              {search && (
                <Button type="button" variant="ghost" size="icon" onClick={() => { setSearchText(""); pushParams({ search: undefined, page: 1 }); }}>
                  <X className="h-4 w-4" /><span className="sr-only">Limpar busca</span>
                </Button>
              )}
            </form>
            <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={selected.size === 0}>Excluir ({selected.size})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir beneficiários selecionados</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita. {selected.size} registro(s) serão removidos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteMany.isPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleteMany.isPending} onClick={() => deleteMany.mutate([...selected])}>
                    {deleteMany.isPending ? "Excluindo..." : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="outline" onClick={handleImportClick} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>) : (<><Upload className="mr-2 h-4 w-4" /> Importar Arquivo</>)}
            </Button>
            <Button onClick={() => router.push(`/health/${encodeURIComponent(clienteId)}/beneficiaries/new${qs}`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Beneficiário
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" />Colunas</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    disabled={c.key === "select"}
                  >{c.label || c.key}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        />

        <div className="flex flex-1 flex-col p-4 pt-0">
          <div className="bg-muted/50 flex-1 rounded-xl p-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Beneficiários</CardTitle>
                <p className="text-sm text-muted-foreground">Lista vinculada ao cliente <code className="px-1 rounded bg-muted">{clienteId}</code>.</p>
              </CardHeader>
              <CardContent>
                {isFetching && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : isError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">Erro ao carregar beneficiários.</p>
                    <p className="text-xs text-muted-foreground break-all">{errorMessage(error)}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {isVisible("select") && <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleSelectAll(Boolean(v))} aria-label="Selecionar todos"/></TableHead>}
                            {isVisible("nomeCompleto") && <TableHead className="w-[28%]">Nome</TableHead>}
                            {isVisible("cpf") && <TableHead>CPF</TableHead>}
                            {isVisible("tipo") && <TableHead>Tipo</TableHead>}
                            {isVisible("plano") && <TableHead>Plano</TableHead>}
                            {isVisible("matricula") && <TableHead>Matrícula</TableHead>}
                            {isVisible("valorMensalidade") && <TableHead>Mensalidade (R$)</TableHead>}
                            {isVisible("status") && <TableHead>Status</TableHead>}
                            {isVisible("actions") && <TableHead className="text-right">Ações</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((b) => {
                            const checked = selected.has(b.id);
                            return (
                              <TableRow
                                key={b.id}
                                className="cursor-pointer hover:bg-accent/50 even:bg-muted/30"
                                onClick={() => router.push(`/health/${encodeURIComponent(clienteId)}/beneficiaries/${encodeURIComponent(b.id)}${qs}`)}
                              >
                                {isVisible("select") && <TableCell onClick={(e) => e.stopPropagation()} className="w-10"><Checkbox checked={checked} onCheckedChange={(v) => toggleOne(b.id, Boolean(v))} aria-label={`Selecionar ${b.nomeCompleto}`}/></TableCell>}
                                {isVisible("nomeCompleto") && <TableCell className="font-medium">{b.nomeCompleto}</TableCell>}
                                {isVisible("cpf") && <TableCell>{b.cpf ?? "—"}</TableCell>}
                                {isVisible("tipo") && <TableCell>{b.tipo}</TableCell>}
                                {isVisible("plano") && <TableCell>{b.plano ?? "—"}</TableCell>}
                                {isVisible("matricula") && <TableCell>{b.matricula ?? "—"}</TableCell>}
                                {isVisible("valorMensalidade") && <TableCell>{b.valorMensalidade != null ? b.valorMensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</TableCell>}
                                {isVisible("status") && <TableCell>{b.status}</TableCell>}
                                {isVisible("actions") && <TableCell className="text-right" onClick={(e) => e.stopPropagation()}><RowActions id={b.id} clienteId={clienteId} /></TableCell>}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>Anterior</Button>
                      <span className="text-sm">Página {currentPage} de {totalPages}</span>
                      <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>Próxima</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <AlertDialog open={!!errorDetails} onOpenChange={(open) => !open && setErrorDetails(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Erros na Importação</AlertDialogTitle>
              <AlertDialogDescription>As seguintes linhas do arquivo não puderam ser importadas.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="max-h-60 overflow-y-auto pr-4 text-sm">
              <ul className="space-y-2">
                {errorDetails?.map((err, index) => (
                  <li key={index} className="rounded-md border bg-muted p-2">
                    <p className="font-semibold">Linha {err.line}: <span className="text-red-500">{err.message}</span></p>
                    <pre className="mt-1 whitespace-pre-wrap break-all text-xs text-muted-foreground">{JSON.stringify(err.data)}</pre>
                  </li>
                ))}
              </ul>
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setErrorDetails(null)}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
    </SidebarProvider>
  );
}