"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

// Layout & UI
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ⬇️ IMPORT DO GRÁFICO (ajuste o caminho conforme onde você salvou o componente)
import { GraficoIdadeBeneficiarios } from "./graficoIdadeBeneficiarios";

// Ícones
import { MoreVertical, SlidersHorizontal, Search, X, Upload, PlusCircle, Loader2, Users, UserCheck, DollarSign } from "lucide-react";

// ---------- Tipos ----------
type PageResult<T> = { items: T[]; page: number; limit: number; total: number };

type BeneficiaryRow = {
  id: string; nomeCompleto: string; cpf?: string | null; tipo: "Titular" | "Dependente";
  dataEntrada: string; dataNascimento?: string | null; idade?: number | null; faixaEtaria?: string | null;
  status: "Ativo" | "Inativo"; titularId?: string | null; matricula?: string | null; carteirinha?: string | null;
  sexo?: string | null; plano?: string | null; centroCusto?: string | null; valorMensalidade?: number | null;
  estado?: string | null; contrato?: string | null; comentario?: string | null;
};

type UploadResult = { created: number; updated: number; inactivated: number; errors: any[]; total: number; }

// ✅ LISTA DE COLUNAS FINAL E COMPLETA
type ColumnKey =
  | "select" | "nomeCompleto" | "cpf" | "tipo" | "dataNascimento" | "idade" | "faixaEtaria"
  | "plano" | "matricula" | "valorMensalidade" | "status" | "comentario" | "actions";

const ALL_COLUMNS: { key: ColumnKey; label: string; default?: boolean }[] = [
  { key: "select", label: "", default: true },
  { key: "nomeCompleto", label: "Nome", default: true },
  { key: "cpf", label: "CPF", default: true },
  { key: "tipo", label: "Tipo", default: true },
  { key: "dataNascimento", label: "Nascimento", default: false },
  { key: "idade", label: "Idade", default: true },
  { key: "faixaEtaria", label: "Faixa Etária", default: true },
  { key: "plano", label: "Plano", default: true },
  { key: "matricula", label: "Matrícula", default: false },
  { key: "valorMensalidade", label: "Mensalidade", default: true },
  { key: "status", label: "Status", default: true },
  { key: "comentario", label: "Observação/Ação", default: false },
  { key: "actions", label: "Ações", default: true },
];
const COLS_LS_KEY = "health.beneficiaries.visibleColumns";

// ---------- Faixas etárias & alertas ----------
type AgeBand = { min: number; max: number; label: string };
const AGE_BANDS: AgeBand[] = [
  { min: 0,  max: 18, label: "0–18" },
  { min: 19, max: 23, label: "19–23" },
  { min: 24, max: 28, label: "24–28" },
  { min: 29, max: 33, label: "29–33" },
  { min: 34, max: 38, label: "34–38" },
  { min: 39, max: 43, label: "39–43" },
  { min: 44, max: 48, label: "44–48" },
  { min: 49, max: 53, label: "49–53" },
  { min: 54, max: 58, label: "54–58" },
  { min: 59, max: 200, label: "59+" },
];
type AgeAlert = "none" | "moderate" | "high";
type AgeInfo = {
  age?: number;
  band?: AgeBand;
  monthsUntilBandChange?: number | null;
  nextBandChangeDate?: Date | null;
  alert: AgeAlert;
};

const rowBgByAlert = (a: AgeAlert) => (a === "high" ? "bg-red-50" : a === "moderate" ? "bg-yellow-50" : "");

function ageFromDob(dob: Date, ref = new Date()) {
  let age = ref.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    ref.getMonth() > dob.getMonth() ||
    (ref.getMonth() === dob.getMonth() && ref.getDate() >= dob.getDate());
  if (!hasHadBirthday) age--;
  return age;
}
const getBand = (age: number) => AGE_BANDS.find((b) => age >= b.min && age <= b.max);
const dateAtAge = (dob: Date, targetAge: number) => {
  const d = new Date(dob);
  d.setFullYear(dob.getFullYear() + targetAge);
  return d;
};
const monthsBetween = (from: Date, to: Date) => {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  let months = y * 12 + m;
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
};
function computeAgeInfo(dobIso?: string | null, ref = new Date()): AgeInfo {
  if (!dobIso) return { alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return { alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };

  const age = ageFromDob(dob, ref);
  const band = getBand(age);
  if (!band) return { age, alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };

  if (!isFinite(band.max) || band.max >= 200) {
    return { age, band, alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  }

  const changeDate = dateAtAge(dob, band.max + 1);
  const months = monthsBetween(ref, changeDate);

  let alert: AgeAlert = "none";
  if (months >= 0 && months < 3) alert = "high";
  else if (months >= 0 && months < 6) alert = "moderate";

  return { age, band, monthsUntilBandChange: months, nextBandChangeDate: changeDate, alert };
}

// ---------- Ações por linha ----------
function RowActions({ id, clienteId }: { id: string; clienteId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const del = useMutation({
    mutationFn: async () => apiFetch<void>(`/clients/${clienteId}/beneficiaries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Beneficiário removido.");
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      setConfirmOpen(false);
    },
    onError: (e: unknown) => toast.error("Falha ao remover.", { description: errorMessage(e) }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" /> <span className="sr-only">Ações</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => router.push(`/health/${clienteId}/beneficiaries/${id}`)}>Editar</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setConfirmOpen(true)}>Excluir</DropdownMenuItem>
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
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={del.isPending} onClick={() => del.mutate()}>
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
    <Suspense fallback={<div className="p-4"><Skeleton className="h-6 w-40 mb-3" /><Skeleton className="h-96 w-full" /></div>}>
      <BeneficiariesPageInner />
    </Suspense>
  );
}

// ---------- Página (conteúdo real) ----------
function BeneficiariesPageInner() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

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
    try { localStorage.setItem(COLS_LS_KEY, JSON.stringify([...visibleCols])); } catch {}
  }, [visibleCols]);
  
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [errorDetails, setErrorDetails] = React.useState<any[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => apiFetch<UploadResult>(`/clients/${clienteId}/beneficiaries/upload`, { method: 'POST', body: formData }),
    onSuccess: (data) => {
      const { created = 0, updated = 0, errors = [] } = data;
      const inactivated = data.inactivated ?? 0;
      const description = `Criados: ${created}, Atualizados: ${updated}, Inativados: ${inactivated}.`;
      if (errors.length > 0) {
        toast.warning(`Importação concluída com ${errors.length} erro(s).`, {
          description: `${description} Clique para ver os detalhes.`,
          duration: 10000,
          action: { label: 'Ver Detalhes', onClick: () => setErrorDetails(errors) }
        });
      } else {
        toast.success('Arquivo processado com sucesso!', { description });
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
  const handleImportClick = () => { fileInputRef.current?.click(); };

  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<BeneficiaryRow>>({
    queryKey: ["beneficiaries", { clienteId, search }],
    queryFn: async () => apiFetch<PageResult<BeneficiaryRow>>(`/clients/${clienteId}/beneficiaries`, { query: { search: search || undefined } }),
    staleTime: 10_000,
  });

  const items: BeneficiaryRow[] = React.useMemo(() => data?.items ?? [], [data]);
  
  // Ordenação hierárquica (Titular -> Dependentes)
  const hierarchicalRows = React.useMemo(() => {
    if (items.length === 0) return [];
    const titulares = items.filter(b => b.tipo === 'Titular').sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
    const dependentsMap = items.reduce((acc, b) => {
      if (b.tipo === 'Dependente' && b.titularId) {
        if (!acc[b.titularId]) acc[b.titularId] = [];
        acc[b.titularId].push(b);
      }
      return acc;
    }, {} as Record<string, BeneficiaryRow[]>);
    const finalRows: BeneficiaryRow[] = [];
    titulares.forEach(titular => {
      finalRows.push(titular);
      const deps = dependentsMap[titular.id] ?? [];
      deps.sort((a,b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
      finalRows.push(...deps);
    });
    return finalRows;
  }, [items]);

  // Enriquecer com AgeInfo (idade calculada, meses até mudar de faixa e alerta)
  const rowsWithAge = React.useMemo(() => {
    const now = new Date();
    return hierarchicalRows.map((b) => {
      const ai = computeAgeInfo(b.dataNascimento ?? null, now);
      // idade vinda da API tem prioridade; se não vier, usa calculada
      const idade = b.idade ?? ai.age ?? null;
      const bandLabel = b.faixaEtaria ?? (ai.band ? ai.band.label : null);
      return { ...b, _ai: ai, idade, _bandLabel: bandLabel };
    });
  }, [hierarchicalRows]);

  const stats = React.useMemo(() => {
    const totalBeneficiarios = items.length;
    const totalTitulares = items.filter((b) => b.tipo === "Titular").length;
    const totalMensalidades = items.reduce((acc, b) => acc + (b.valorMensalidade ?? 0), 0);
    return { totalBeneficiarios, totalTitulares, totalDependentes: totalBeneficiarios - totalTitulares, totalMensalidades };
  }, [items]);

  React.useEffect(() => {
    if (!items.length && selected.size === 0) return;
    const idsOnPage = new Set(items.map((i) => i.id));
    setSelected((prev) => new Set([...prev].filter((id) => idsOnPage.has(id))));
  }, [items, selected.size]);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) => apiFetch<void>(`/clients/${clienteId}/beneficiaries/bulk-delete`, { method: 'POST', body: { ids } }),
    onSuccess: () => {
      toast.success(`${selected.size} beneficiário(s) removido(s).`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      setBulkOpen(false);
    },
    onError: (e: unknown) => toast.error("Falha ao remover.", { description: errorMessage(e) }),
  });

  const pushParams = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => { v ? p.set(k, v) : p.delete(k); });
    router.push(`/health/${clienteId}/beneficiaries?${p.toString()}`);
  };
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); pushParams({ search: searchText || undefined }); };

  const isVisible = (key: ColumnKey) => visibleCols.has(key);
  const toggleCol = (key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if ([...next].filter((k) => k !== "select").length <= 1 && key !== "select") return next;
        next.delete(key);
      } else { next.add(key); }
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
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "—";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/health">Saúde</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>Beneficiários</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4 flex items-center gap-2">
            <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-[240px]" placeholder="Buscar..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </div>
              <Button type="submit" variant="secondary" size="sm">Buscar</Button>
              {search && (
                <Button type="button" variant="ghost" size="icon" onClick={() => { setSearchText(""); pushParams({ search: undefined }); }}>
                  <X className="h-4 w-4" /><span className="sr-only">Limpar</span>
                </Button>
              )}
            </form>
            <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={selected.size === 0}>Excluir ({selected.size})</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir beneficiários</AlertDialogTitle>
                  <AlertDialogDescription>Ação irreversível. {selected.size} registro(s) serão removidos.</AlertDialogDescription>
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
              {uploadMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>) : (<><Upload className="mr-2 h-4 w-4" /> Importar</>)}
            </Button>
            <Button onClick={() => router.push(`/health/${clienteId}/beneficiaries/new`)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Novo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4 w-4" />Colunas</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visibilidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map((c) => (
                  <DropdownMenuCheckboxItem key={c.key} checked={visibleCols.has(c.key)} onCheckedChange={() => toggleCol(c.key)} disabled={c.key === "select"}>
                    {c.label || c.key}
                  </DropdownMenuCheckboxItem>
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

        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />Total de Vidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalBeneficiarios}</div>
                <p className="text-xs text-muted-foreground mt-1">Titulares + Dependentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />Divisão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalTitulares} <span className="text-base font-normal">T</span> / {stats.totalDependentes} <span className="text-base font-normal">Dependentes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total de vidas ativas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />Custo Total (Mensal)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brl(stats.totalMensalidades)}</div>
                <p className="text-xs text-muted-foreground mt-1">Soma das mensalidades</p>
              </CardContent>
            </Card>

            {/* ⬇️ NOVO: gráfico de vidas por idade ocupando a linha inteira no desktop */}
            <div className="sm:col-span-2 lg:col-span-3">
              <GraficoIdadeBeneficiarios items={items} binSize={5} title="Distribuição de vidas por idade" subtitle="Agrupado em faixas de 5 anos" />
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Lista de Beneficiários</CardTitle></CardHeader>
            <CardContent>
              {isFetching && !data ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-20 w-full" /></div>
              ) : isError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">Erro ao carregar.</p>
                  <p className="text-xs text-muted-foreground break-all">{errorMessage(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar</Button>
                </div>
              ) : (
                <TooltipProvider>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {isVisible("select") && <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleSelectAll(Boolean(v))} /></TableHead>}
                          {isVisible("nomeCompleto") && <TableHead>Nome</TableHead>}
                          {isVisible("cpf") && <TableHead>CPF</TableHead>}
                          {isVisible("tipo") && <TableHead>Tipo</TableHead>}
                          {isVisible("dataNascimento") && <TableHead>Nascimento</TableHead>}
                          {isVisible("idade") && <TableHead>Idade</TableHead>}
                          {isVisible("faixaEtaria") && <TableHead>Faixa Etária</TableHead>}
                          {isVisible("plano") && <TableHead>Plano</TableHead>}
                          {isVisible("matricula") && <TableHead>Matrícula</TableHead>}
                          {isVisible("valorMensalidade") && <TableHead>Mensalidade</TableHead>}
                          {isVisible("status") && <TableHead>Status</TableHead>}
                          {isVisible("comentario") && <TableHead>Observação</TableHead>}
                          {isVisible("actions") && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowsWithAge.map((b) => {
                          const ai = b._ai as ReturnType<typeof computeAgeInfo>;
                          const bg = rowBgByAlert(ai.alert);
                          const showTooltip = ai.alert === "high" || ai.alert === "moderate";
                          const tooltipMsg =
                            ai.monthsUntilBandChange != null && ai.monthsUntilBandChange >= 0
                              ? `Muda de faixa em ${ai.monthsUntilBandChange} ${ai.monthsUntilBandChange === 1 ? "mês" : "meses"}${ai.nextBandChangeDate ? ` (${ai.nextBandChangeDate.toLocaleDateString("pt-BR")})` : ""}`
                              : "Sem mudança de faixa prevista";

                          const isDependente = b.tipo === "Dependente";

                          return (
                            <TableRow
                              key={b.id}
                              onClick={() => router.push(`/health/${clienteId}/beneficiaries/${b.id}`)}
                              className={`${bg} cursor-pointer`}
                            >
                              {isVisible("select") && (
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox checked={selected.has(b.id)} onCheckedChange={(v) => toggleOne(b.id, Boolean(v))} />
                                </TableCell>
                              )}

                              {isVisible("nomeCompleto") && (
                                <TableCell className={`font-medium ${isDependente ? "pl-10" : ""}`}>
                                  {isDependente && "↳ "}
                                  {b.nomeCompleto}
                                </TableCell>
                              )}

                              {isVisible("cpf") && <TableCell>{b.cpf ?? "—"}</TableCell>}
                              {isVisible("tipo") && <TableCell>{b.tipo}</TableCell>}
                              {isVisible("dataNascimento") && <TableCell>{formatDate(b.dataNascimento)}</TableCell>}

                              {isVisible("idade") && (
                                <TableCell>
                                  {showTooltip ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted">
                                          {b.idade ?? "—"}
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            ({ai.alert === "high" ? "Alerta alto" : "Alerta moderado"})
                                          </span>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>{tooltipMsg}</p></TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span>{b.idade ?? "—"}</span>
                                  )}
                                </TableCell>
                              )}

                              {isVisible("faixaEtaria") && <TableCell>{b._bandLabel ?? "—"}</TableCell>}
                              {isVisible("plano") && <TableCell>{b.plano ?? "—"}</TableCell>}
                              {isVisible("matricula") && <TableCell>{b.matricula ?? "—"}</TableCell>}
                              {isVisible("valorMensalidade") && <TableCell>{b.valorMensalidade ? brl(b.valorMensalidade) : "—"}</TableCell>}
                              {isVisible("status") && <TableCell>{b.status}</TableCell>}
                              {isVisible("comentario") && <TableCell>{b.comentario ?? "—"}</TableCell>}

                              {isVisible("actions") && (
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <RowActions id={b.id} clienteId={clienteId} />
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
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
            <AlertDialogFooter><AlertDialogAction onClick={() => setErrorDetails(null)}>Fechar</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
    </SidebarProvider>
  );
}
