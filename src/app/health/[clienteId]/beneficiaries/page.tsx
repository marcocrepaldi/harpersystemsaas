// [FRONTEND] app/health/[clienteId]/beneficiaries/page.tsx
'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Modal e Tabs
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { GraficoIdadeBeneficiarios } from "./graficoIdadeBeneficiarios";

import { MoreVertical, SlidersHorizontal, Search, X, Upload, PlusCircle, Loader2, Users, UserCheck, DollarSign, ClipboardList, Copy, CheckCircle2, AlertTriangle } from "lucide-react";

/* ===================== Tipos ===================== */

type PageResult<T> = { items: T[]; page: number; limit: number; total: number };

type BeneficiaryRow = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;
  tipo: string;
  dataEntrada: string;
  dataNascimento?: string | null;
  idade?: number | null;
  valorMensalidade?: number | null;
  titularId?: string | null;
  titularNome?: string | null;
  matricula?: string | null;
  carteirinha?: string | null;
  sexo?: string | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;
  estado?: string | null;
  contrato?: string | null;
  comentario?: string | null;
  regimeCobranca?: string | null;
  motivoMovimento?: string | null;
  observacoes?: string | null;

  Empresa?: string | null;
  Cpf?: string | null;
  Usuario?: string | null;
  Nm_Social?: string | null;
  Estado_Civil?: string | null;
  Data_Nascimento?: string | null;
  Sexo?: string | null;
  Identidade?: string | null;
  Orgao_Exp?: string | null;
  Uf_Orgao?: string | null;
  Uf_Endereco?: string | null;
  Cidade?: string | null;
  Tipo_Logradouro?: string | null;
  Logradouro?: string | null;
  Numero?: string | null;
  Complemento?: string | null;
  Bairro?: string | null;
  Cep?: string | null;
  Fone?: string | null;
  Celular?: string | null;
  Plano?: string | null;
  Matricula?: string | null;
  Filial?: string | null;
  Codigo_Usuario?: string | null;
  Dt_Admissao?: string | null;
  Codigo_Congenere?: string | null;
  Nm_Congenere?: string | null;
  Tipo_Usuario?: string | null;
  Nome_Mae?: string | null;
  Pis?: string | null;
  Cns?: string | null;
  Ctps?: string | null;
  Serie_Ctps?: string | null;
  Data_Processamento?: string | null;
  Data_Cadastro?: string | null;
  Unidade?: string | null;
  Descricao_Unidade?: string | null;
  Cpf_Dependente?: string | null;
  Grau_Parentesco?: string | null;
  Dt_Casamento?: string | null;
  Nu_Registro_Pessoa_Natural?: string | null;
  Cd_Tabela?: string | null;
  Empresa_Utilizacao?: string | null;
  Dt_Cancelamento?: string | null;

  status: string;
  dataSaida?: string | null;
};

type CsvColumn = {
  key: string;
  field: keyof BeneficiaryRow & string;
  label: string;
  isDate?: boolean;
};

const RAW_CSV_COLUMNS = [
  { key: "csv_Empresa", field: "Empresa", label: "Empresa" },
  { key: "csv_Cpf", field: "Cpf", label: "CPF (Operadora)" },
  { key: "csv_Usuario", field: "Usuario", label: "Usuário (Operadora)" },
  { key: "csv_Nm_Social", field: "Nm_Social", label: "Nome Social" },
  { key: "csv_Estado_Civil", field: "Estado_Civil", label: "Estado Civil" },
  { key: "csv_Data_Nascimento", field: "Data_Nascimento", label: "Nascimento (Operadora)", isDate: true },
  { key: "csv_Sexo", field: "Sexo", label: "Sexo (Operadora)" },
  { key: "csv_Identidade", field: "Identidade", label: "Identidade" },
  { key: "csv_Orgao_Exp", field: "Orgao_Exp", label: "Órgão Exp." },
  { key: "csv_Uf_Orgao", field: "Uf_Orgao", label: "UF Órgão" },
  { key: "csv_Uf_Endereco", field: "Uf_Endereco", label: "UF Endereço" },
  { key: "csv_Cidade", field: "Cidade", label: "Cidade" },
  { key: "csv_Tipo_Logradouro", field: "Tipo_Logradouro", label: "Tipo Logradouro" },
  { key: "csv_Logradouro", field: "Logradouro", label: "Logradouro" },
  { key: "csv_Numero", field: "Numero", label: "Número" },
  { key: "csv_Complemento", field: "Complemento", label: "Complemento" },
  { key: "csv_Bairro", field: "Bairro", label: "Bairro" },
  { key: "csv_Cep", field: "Cep", label: "CEP" },
  { key: "csv_Fone", field: "Fone", label: "Telefone" },
  { key: "csv_Celular", field: "Celular", label: "Celular" },
  { key: "csv_Plano", field: "Plano", label: "Plano (Operadora)" },
  { key: "csv_Matricula", field: "Matricula", label: "Matrícula (Operadora)" },
  { key: "csv_Filial", field: "Filial", label: "Filial" },
  { key: "csv_Codigo_Usuario", field: "Codigo_Usuario", label: "Código Usuário" },
  { key: "csv_Dt_Admissao", field: "Dt_Admissao", label: "Admissão", isDate: true },
  { key: "csv_Codigo_Congenere", field: "Codigo_Congenere", label: "Cód. Congênere" },
  { key: "csv_Nm_Congenere", field: "Nm_Congenere", label: "Nome Congênere" },
  { key: "csv_Tipo_Usuario", field: "Tipo_Usuario", label: "Tipo Usuário" },
  { key: "csv_Nome_Mae", field: "Nome_Mae", label: "Nome da Mãe" },
  { key: "csv_Pis", field: "Pis", label: "PIS" },
  { key: "csv_Cns", field: "Cns", label: "CNS" },
  { key: "csv_Ctps", field: "Ctps", label: "CTPS" },
  { key: "csv_Serie_Ctps", field: "Serie_Ctps", label: "Série CTPS" },
  { key: "csv_Data_Processamento", field: "Data_Processamento", label: "Processamento", isDate: true },
  { key: "csv_Data_Cadastro", field: "Data_Cadastro", label: "Cadastro", isDate: true },
  { key: "csv_Unidade", field: "Unidade", label: "Unidade" },
  { key: "csv_Descricao_Unidade", field: "Descricao_Unidade", label: "Descrição Unidade" },
  { key: "csv_Cpf_Dependente", field: "Cpf_Dependente", label: "CPF Dependente" },
  { key: "csv_Grau_Parentesco", field: "Grau_Parentesco", label: "Grau Parentesco" },
  { key: "csv_Dt_Casamento", field: "Dt_Casamento", label: "Data Casamento", isDate: true },
  { key: "csv_Nu_Registro_Pessoa_Natural", field: "Nu_Registro_Pessoa_Natural", label: "Nº RPN" },
  { key: "csv_Cd_Tabela", field: "Cd_Tabela", label: "Cód. Tabela" },
  { key: "csv_Empresa_Utilizacao", field: "Empresa_Utilizacao", label: "Empresa Utilização" },
  { key: "csv_Dt_Cancelamento", field: "Dt_Cancelamento", label: "Cancelamento", isDate: true },
] as const;

const CSV_COLUMNS = RAW_CSV_COLUMNS as readonly CsvColumn[];
type CsvColumnKey = typeof RAW_CSV_COLUMNS[number]["key"];

type UpdatedDetail = {
  row: number;
  id: string;
  cpf?: string | null;
  nome?: string | null;
  tipo?: string | null;
  matchBy: 'CPF' | 'NOME_DTNASC';
  changed: Array<{ scope: 'core' | 'operadora'; field: string; before: any; after: any }>;
};

type UploadSummary = {
  totalLinhas: number;
  processados: number;
  criados: number;
  atualizados: number;
  rejeitados: number;
  atualizadosPorCpf: number;
  atualizadosPorNomeData: number;
  duplicadosNoArquivo: { cpf: string; ocorrencias: number }[];
  porMotivo?: { motivo: string; count: number }[];
  porTipo?: {
    titulares: { criados: number; atualizados: number };
    dependentes: { criados: number; atualizados: number };
  };
};

type UploadResult = {
  ok: boolean;
  runId?: string;
  summary: UploadSummary;
  errors: Array<{ row: number; motivo: string; dados?: any }>;
  updatedDetails: UpdatedDetail[];
  duplicatesInFile: { cpf: string; rows: number[] }[];
};

/* ===================== Colunas ===================== */

type ColumnKey =
  | "select" | "nomeCompleto" | "cpf" | "tipo"
  | "dataEntrada" | "dataNascimento" | "idade" | "faixaEtaria" | "sexo"
  | "plano" | "centroCusto" | "matricula" | "carteirinha"
  | "valorMensalidade" | "estado" | "contrato"
  | "titular" | "regimeCobranca" | "motivoMovimento" | "observacoes"
  | "status" | "dataSaida" | "comentario" | "actions"
  | CsvColumnKey;

const ALL_COLUMNS: { key: ColumnKey; label: string; default?: boolean; category?: string }[] = [
  { key: "select", label: "", default: true },

  { key: "nomeCompleto", label: "Nome", default: true, category: "Dados Principais" },
  { key: "cpf", label: "CPF", default: true, category: "Dados Principais" },
  { key: "tipo", label: "Tipo", default: true, category: "Dados Principais" },
  { key: "status", label: "Status", default: true, category: "Dados Principais" },
  { key: "actions", label: "Ações", default: true, category: "Dados Principais" },

  { key: "sexo", label: "Sexo", default: false, category: "Detalhes do Beneficiário" },
  { key: "idade", label: "Idade", default: true, category: "Detalhes do Beneficiário" },
  { key: "dataNascimento", label: "Nascimento", default: false, category: "Detalhes do Beneficiário" },
  { key: "faixaEtaria", label: "Faixa Etária", default: true, category: "Detalhes do Beneficiário" },
  { key: "titular", label: "Titular", default: false, category: "Detalhes do Beneficiário" },

  { key: "dataEntrada", label: "Vigência (Entrada)", default: false, category: "Plano" },
  { key: "plano", label: "Plano", default: true, category: "Plano" },
  { key: "centroCusto", label: "Centro de Custo", default: false, category: "Plano" },
  { key: "matricula", label: "Matrícula", default: false, category: "Plano" },
  { key: "carteirinha", label: "Carteirinha", default: false, category: "Plano" },
  { key: "estado", label: "UF", default: false, category: "Plano" },
  { key: "contrato", label: "Contrato", default: false, category: "Plano" },

  { key: "dataSaida", label: "Data de Saída", default: false, category: "Status & Movimento" },
  { key: "regimeCobranca", label: "Regime Cobrança", default: false, category: "Status & Movimento" },
  { key: "motivoMovimento", label: "Motivo Movimento", default: false, category: "Status & Movimento" },

  { key: "valorMensalidade", label: "Mensalidade", default: true, category: "Dados Financeiros" },
  { key: "observacoes", label: "Observações", default: false, category: "Dados Financeiros" },

  { key: "comentario", label: "Observação/Ação", default: false, category: "Anotações" },

  ...CSV_COLUMNS.map((c) => ({
    key: c.key as ColumnKey,
    label: c.label,
    default: false,
    category: "Operadora/CSV",
  })),
];

const COLS_LS_KEY = "health.beneficiaries.visibleColumns";

/* ===================== Faixas etárias ===================== */

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
const dateAtAge = (dob: Date, targetAge: number) => { const d = new Date(dob); d.setFullYear(dob.getFullYear() + targetAge); return d; };
const monthsBetween = (from: Date, to: Date) => { const y = to.getFullYear() - from.getFullYear(); const m = to.getMonth() - from.getMonth(); let months = y * 12 + m; if (to.getDate() < from.getDate()) months -= 1; return months; };
function computeAgeInfo(dobIso?: string | null, ref = new Date()): AgeInfo {
  if (!dobIso) return { alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return { alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  const age = ageFromDob(dob, ref);
  const band = getBand(age);
  if (!band) return { age, alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  if (!isFinite(band.max) || band.max >= 200) return { age, band, alert: "none", monthsUntilBandChange: null, nextBandChangeDate: null };
  const changeDate = dateAtAge(dob, band.max + 1);
  const months = monthsBetween(ref, changeDate);
  let alert: AgeAlert = "none";
  if (months >= 0 && months < 3) alert = "high";
  else if (months >= 0 && months < 6) alert = "moderate";
  return { age, band, monthsUntilBandChange: months, nextBandChangeDate: changeDate, alert };
}

/* ===================== Formatadores ===================== */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DT = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

const brl = (n: number) => BRL.format(Number.isFinite(n) ? n : 0);
const formatDate = (d?: string | null) => (d ? DT.format(new Date(d)) : "—");

const formatMaybeDate = (s?: string | null) => {
  if (!s) return "—";
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) {
    return DT.format(new Date(t));
  }
  return t || "—";
};

/* ===================== Helpers de domínio ===================== */

const isTitular = (tipo?: string | null) =>
  !!tipo && (tipo === 'Titular' || tipo.toUpperCase() === 'TITULAR');

const tipoLabel = (tipo?: string | null) => {
  if (!tipo) return '—';
  const t = tipo.toUpperCase();
  if (t === 'TITULAR') return 'Titular';
  if (t.includes('FILHO')) return 'Filho';
  if (t.includes('CONJUGE') || t.includes('CÔNJUGE')) return 'Cônjuge';
  if (t.includes('DEPENDENTE')) return 'Dependente';
  return tipo;
};

const statusLabel = (status?: string | null) => {
  if (!status) return '—';
  const s = status.toUpperCase();
  if (s === 'ATIVO') return 'Ativo';
  if (s === 'INATIVO') return 'Inativo';
  return status;
};

function getDisplayCpf(b: BeneficiaryRow): { value: string; origin: 'core' | 'dep' | 'operadora' | 'none' } {
  const core = (b.cpf ?? '').trim();
  const op = (b.Cpf ?? '').trim();
  const dep = (b.Cpf_Dependente ?? '').trim();

  if (isTitular(b.tipo)) {
    if (core) return { value: core, origin: 'core' };
    if (op) return { value: op, origin: 'operadora' };
    return { value: '—', origin: 'none' };
  }
  if (core) return { value: core, origin: 'core' };
  if (dep) return { value: dep, origin: 'dep' };
  if (op) return { value: op, origin: 'operadora' };
  return { value: '—', origin: 'none' };
}

/* ===================== Ações por linha ===================== */

function RowActions({ id, clienteId }: { id: string; clienteId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const del = useMutation({
    mutationFn: async () => apiFetch<void>(`/clients/${clienteId}/beneficiaries/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast.success("Beneficiário removido."); qc.invalidateQueries({ queryKey: ["beneficiaries"] }); setConfirmOpen(false); },
    onError: (e: unknown) => toast.error("Falha ao remover.", { description: errorMessage(e) }),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()} aria-label="Ações">
            <MoreVertical className="h-4 w-4" />
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

/* ===================== Modal 3 Abas (revisado) ===================== */

// Normalizador robusto para o payload do upload (evita modal vazio)
function normalizeUploadResult(x: any): UploadResult | null {
  if (!x) return null;
  const r: any = x?.result ?? x?.data ?? x;
  if (!r || typeof r !== 'object') return null;

  r.summary ??= {
    totalLinhas: 0,
    processados: 0,
    criados: 0,
    atualizados: 0,
    rejeitados: 0,
    atualizadosPorCpf: 0,
    atualizadosPorNomeData: 0,
    duplicadosNoArquivo: [],
  };
  r.errors = Array.isArray(r.errors) ? r.errors : [];
  r.updatedDetails = Array.isArray(r.updatedDetails) ? r.updatedDetails : [];
  r.duplicatesInFile = Array.isArray(r.duplicatesInFile) ? r.duplicatesInFile : [];
  r.runId = r.runId ?? x?.runId ?? r?.id ?? 'sem-id';

  return r as UploadResult;
}

function ImportReviewModal({
  open,
  onOpenChange,
  result,
  onOpenFullPage,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  result: UploadResult | null;
  onOpenFullPage?: (runId?: string) => void;
}) {
  const s = result?.summary;
  const totalChangedFields = (result?.updatedDetails ?? []).reduce((acc, d) => acc + d.changed.length, 0);

  const copyJson = async (obj: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj ?? {}, null, 2));
      toast.success("Copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[1100px] max-h-[85vh] overflow-hidden p-0 rounded-xl">
        {!result ? (
          <div className="p-6">
            <DialogHeader className="p-0">
              <DialogTitle>Erros e Evidências de Importação</DialogTitle>
              <DialogDescription>Importe um arquivo para visualizar o resumo.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 text-sm text-muted-foreground">
              Nenhum resultado de importação disponível nesta sessão.
            </div>
          </div>
        ) : (
          // Um ÚNICO Tabs root envolvendo triggers (sticky) + conteúdos (rolável)
          <Tabs defaultValue="updated" className="h-full">
            {/* Header sticky */}
            <div className="sticky top-0 z-10 border-b bg-background">
              <div className="px-5 pt-5">
                <DialogHeader className="p-0">
                  <DialogTitle>Erros e Evidências de Importação</DialogTitle>
                  <DialogDescription>Visualize o que foi criado/atualizado, duplicidades e erros rejeitados.</DialogDescription>
                </DialogHeader>
                {result.runId && onOpenFullPage && (
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenFullPage(result.runId)}>
                      Abrir página completa
                    </Button>
                  </div>
                )}
              </div>

              {/* Cards de resumo */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-5 pb-4">
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Total linhas</div><div className="text-xl font-semibold">{s?.totalLinhas ?? 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Processados</div><div className="text-xl font-semibold">{s?.processados ?? 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Criados</div><div className="text-xl font-semibold text-emerald-600">{s?.criados ?? 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Atualizados</div><div className="text-xl font-semibold text-blue-600">{s?.atualizados ?? 0}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Rejeitados</div><div className="text-xl font-semibold text-red-600">{s?.rejeitados ?? 0}</div></CardContent></Card>
              </div>

              {/* Abas (gatilhos) */}
              <div className="px-5 pb-3">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="updated">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Atualizados ({s?.atualizados ?? 0}){totalChangedFields ? <span className="ml-2 text-xs text-muted-foreground">• {totalChangedFields} alterações</span> : null}
                  </TabsTrigger>
                  <TabsTrigger value="dups">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Duplicidades ({s?.duplicadosNoArquivo?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="errors">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Erros ({result?.errors?.length ?? 0})
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Conteúdo rolável */}
            <div className="px-5 pb-5 max-h-[70vh] overflow-auto">
              {/* ATUALIZADOS */}
              <TabsContent value="updated" className="mt-4">
                <div className="flex flex-wrap gap-3 mb-3 text-sm text-muted-foreground">
                  <span>Por CPF: <b>{s?.atualizadosPorCpf ?? 0}</b></span>
                  <span>Por Nome+Dt.Nasc: <b>{s?.atualizadosPorNomeData ?? 0}</b></span>
                  <Button variant="outline" size="sm" onClick={() => copyJson(result?.updatedDetails ?? [])}><Copy className="h-3.5 w-3.5 mr-2" />Copiar JSON</Button>
                </div>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead># Linha</TableHead>
                        <TableHead>Beneficiário</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Alterações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result?.updatedDetails ?? []).map((u) => (
                        <TableRow key={`${u.id}-${u.row}`}>
                          <TableCell>{u.row}</TableCell>
                          <TableCell className="font-medium">{u.nome ?? "—"}</TableCell>
                          <TableCell>{u.cpf ?? "—"}</TableCell>
                          <TableCell>{u.matchBy === 'CPF' ? 'CPF' : 'Nome + Data Nasc.'}</TableCell>
                          <TableCell>
                            {u.changed.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <div className="space-y-1">
                                {u.changed.map((c, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="px-1 py-0.5 rounded bg-muted mr-2">{c.scope}</span>
                                    <b>{c.field}</b>: <span className="line-through text-muted-foreground">{String(c.before ?? '—')}</span> → <span>{String(c.after ?? '—')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(result?.updatedDetails?.length ?? 0) === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum registro atualizado.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* DUPLICIDADES */}
              <TabsContent value="dups" className="mt-4">
                <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
                  <span>CPF repetido no arquivo indica linhas que podem ter sido mescladas em um único update.</span>
                  <Button variant="outline" size="sm" onClick={() => copyJson(result?.duplicatesInFile ?? [])}><Copy className="h-3.5 w-3.5 mr-2" />Copiar JSON</Button>
                </div>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead>CPF</TableHead>
                        <TableHead>Ocorrências</TableHead>
                        <TableHead>Linhas do arquivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result?.duplicatesInFile ?? []).map((d) => (
                        <TableRow key={d.cpf}>
                          <TableCell className="font-medium">{d.cpf}</TableCell>
                          <TableCell>{d.rows.length}</TableCell>
                          <TableCell>{d.rows.join(', ')}</TableCell>
                        </TableRow>
                      ))}
                      {(result?.duplicatesInFile?.length ?? 0) === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhuma duplicidade encontrada no arquivo.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* ERROS */}
              <TabsContent value="errors" className="mt-4">
                <div className="flex items-center gap-3 mb-3 text-sm text-muted-foreground">
                  <span>Linhas rejeitadas durante a importação.</span>
                  <Button variant="outline" size="sm" onClick={() => copyJson(result?.errors ?? [])}><Copy className="h-3.5 w-3.5 mr-2" />Copiar JSON</Button>
                </div>
                <div className="rounded-lg border overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow>
                        <TableHead># Linha</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Dados (resumo)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(result?.errors ?? []).map((e, i) => (
                        <TableRow key={`${e.row}-${i}`}>
                          <TableCell>{e.row}</TableCell>
                          <TableCell className="text-red-600">{e.motivo}</TableCell>
                          <TableCell className="max-w-[520px] truncate" title={JSON.stringify(e.dados ?? {})}>
                            {e.dados ? JSON.stringify(e.dados).slice(0, 120) + (JSON.stringify(e.dados).length > 120 ? '…' : '') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(result?.errors?.length ?? 0) === 0 && (
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem erros para exibir.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Página ===================== */

export default function BeneficiariesPage() {
  return (
    <Suspense fallback={<div className="p-4"><Skeleton className="h-6 w-40 mb-3" /><Skeleton className="h-96 w-full" /></div>}>
      <BeneficiariesPageInner />
    </Suspense>
  );
}

/* ===================== filtros URL → backend ===================== */

const normalizeTipo = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (s === 'todos' || s === 'all' || s === '') return undefined;
  if (s === 'titular') return 'TITULAR';
  if (s === 'filho') return 'FILHO';
  if (s === 'cônjuge' || s === 'conjuge') return 'CONJUGE';
  if (s === 'dependente') return 'DEPENDENTE';
  return v.toUpperCase();
};
const normalizeStatus = (v: string | null): string | undefined => {
  if (!v) return undefined;
  const s = v.trim().toLowerCase();
  if (s === 'todos' || s === 'all' || s === '') return undefined;
  if (s === 'ativo') return 'ATIVO';
  if (s === 'inativo') return 'INATIVO';
  return v.toUpperCase();
};

function BeneficiariesPageInner() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<UploadResult | null>(null);

  const search = searchParams.get("search") ?? "";
  const tipoParam = searchParams.get("tipo") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const [searchText, setSearchText] = React.useState(search);

  React.useEffect(() => { setSearchText(search); }, [search]);

  const [visibleCols, setVisibleCols] = React.useState<Set<ColumnKey>>(() => {
    try { const raw = localStorage.getItem(COLS_LS_KEY); if (raw) return new Set(JSON.parse(raw) as ColumnKey[]); } catch {}
    return new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key));
  });
  React.useEffect(() => { try { localStorage.setItem(COLS_LS_KEY, JSON.stringify([...visibleCols])); } catch {} }, [visibleCols]);

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const openFullImportPage = React.useCallback((runId?: string) => {
    if (runId) router.push(`/health/${clienteId}/beneficiaries/imports/${runId}`);
    else router.push(`/health/${clienteId}/beneficiaries/imports/latest`);
  }, [clienteId, router]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<any>(`/clients/${clienteId}/beneficiaries/upload`, {
        method: 'POST',
        body: formData,
      }),
    onSuccess: (raw) => {
      const resp = normalizeUploadResult(raw);
      setUploadResult(resp);
      setReviewOpen(true);

      const s = resp?.summary ?? { criados: 0, atualizados: 0, rejeitados: 0, totalLinhas: 0, processados: 0 };
      const baseDesc = `Criados: ${s.criados}, Atualizados: ${s.atualizados}.`;
      const topErros = resp?.summary?.porMotivo?.length
        ? resp.summary.porMotivo.slice(0, 3).map(e => `${e.motivo}: ${e.count}`).join(' • ')
        : '—';

      if ((resp?.errors?.length ?? 0) > 0 || (s.rejeitados ?? 0) > 0) {
        toast.warning(`Importação concluída com ${s.rejeitados} erro(s).`, {
          description: `${baseDesc} Top erros: ${topErros}`,
          duration: 12000,
          action: { label: 'Ver detalhes', onClick: () => setReviewOpen(true) },
        });
      } else {
        toast.success('Arquivo processado com sucesso!', {
          description: baseDesc,
          duration: 8000,
          action: { label: 'Ver resumo', onClick: () => setReviewOpen(true) },
        });
      }

      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
    },
    onError: (e) =>
      toast.error('Falha ao importar arquivo.', { description: errorMessage(e) }),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { const formData = new FormData(); formData.append('file', file); uploadMutation.mutate(formData); }
    event.target.value = '';
  };
  const handleImportClick = () => { fileInputRef.current?.click(); };

  const queryTipo = normalizeTipo(tipoParam);
  const queryStatus = normalizeStatus(statusParam);

  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<BeneficiaryRow>>({
    queryKey: ["beneficiaries", { clienteId, search, tipo: queryTipo ?? 'ALL', status: queryStatus ?? 'ALL' }],
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiFetch<PageResult<BeneficiaryRow>>(`/clients/${clienteId}/beneficiaries`, {
        query: { search: search || undefined, tipo: queryTipo, status: queryStatus },
        signal,
      }),
    staleTime: 10_000,
  });

  const items: BeneficiaryRow[] = React.useMemo(
    () => (Array.isArray(data?.items) ? data!.items : []),
    [data]
  );

  const hierarchicalRows = React.useMemo<BeneficiaryRow[]>(() => {
    const list = Array.isArray(items) ? items.slice() : [];
    if (list.length === 0) return [];
    const titulares = list
      .filter((b) => isTitular(b.tipo))
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
    if (titulares.length === 0) {
      return list.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
    }
    const dependentsMap = list.reduce((acc, b) => {
      if (!isTitular(b.tipo) && b.titularId) {
        if (!acc[b.titularId]) acc[b.titularId] = [];
        acc[b.titularId].push(b);
      }
      return acc;
    }, {} as Record<string, BeneficiaryRow[]>);
    const finalRows: BeneficiaryRow[] = [];
    titulares.forEach((titular) => {
      finalRows.push(titular);
      const deps = (dependentsMap[titular.id] ?? []).sort((a, b) =>
        a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR')
      );
      finalRows.push(...deps);
    });
    return finalRows;
  }, [items]);

  const rowsWithAge = React.useMemo(() => {
    const list = Array.isArray(hierarchicalRows) ? hierarchicalRows : [];
    const now = new Date();
    return list.map((b) => {
      const ai = computeAgeInfo(b.dataNascimento ?? null, now);
      const idade = b.idade ?? ai.age ?? null;
      const bandLabel = b.faixaEtaria ?? (ai.band ? ai.band.label : null);
      return { ...b, _ai: ai, idade, _bandLabel: bandLabel } as const;
    });
  }, [hierarchicalRows]);

  const stats = React.useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const totalBeneficiarios = list.length;
    const totalTitulares = list.filter((b) => isTitular(b.tipo)).length;
    const totalDependentes = totalBeneficiarios - totalTitulares;
    const totalMensalidades = list.reduce((acc, b) => acc + (b.valorMensalidade ?? 0), 0);
    return { totalBeneficiarios, totalTitulares, totalDependentes, totalMensalidades };
  }, [items]);

  React.useEffect(() => {
    if (!items.length && selected.size === 0) return;
    const idsOnPage = new Set(items.map((i) => i.id));
    setSelected((prev) => new Set([...prev].filter((id) => idsOnPage.has(id))));
  }, [items, selected.size]);

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) =>
      apiFetch<void>(`/clients/${clienteId}/beneficiaries/bulk-delete`, { method: 'POST', body: { ids } }),
    onSuccess: () => { toast.success(`${selected.size} beneficiário(s) removido(s).`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["beneficiaries"] }); setBulkOpen(false); },
    onError: (e: unknown) => toast.error("Falha ao remover.", { description: errorMessage(e) }),
  });

  const pushParams = React.useCallback((updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    Object.entries(updates).forEach(([k, v]) => {
      const current = p.get(k) ?? undefined;
      if (v === undefined) {
        if (current !== undefined) { p.delete(k); changed = true; }
      } else {
        if (current !== v) { p.set(k, v); changed = true; }
      }
    });
    if (changed) router.push(`/health/${clienteId}/beneficiaries?${p.toString()}`);
  }, [clienteId, router, searchParams]);

  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); pushParams({ search: searchText || undefined }); };

  const [visibleColsState] = React.useState(ALL_COLUMNS);
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
    setSelected((prev) => { const next = new Set(prev); if (checked) next.add(id); else next.delete(id); return next; });
  };

  const columnCategories = React.useMemo(() => {
    return visibleColsState.reduce((acc, col) => {
      const category = col.category || "Outros";
      if (!acc[category]) acc[category] = [];
      acc[category].push(col);
      return acc;
    }, {} as Record<string, { key: ColumnKey; label: string; default?: boolean; category?: string }[]>);
  }, [visibleColsState]);

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
                <Button type="button" variant="ghost" size="icon" onClick={() => { setSearchText(""); pushParams({ search: undefined }); }} aria-label="Limpar busca">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </form>

            <Select
              value={normalizeTipo(tipoParam) ?? "ALL"}
              onValueChange={(v) => pushParams({ tipo: v === "ALL" ? undefined : v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tipo (Todos)</SelectItem>
                <SelectItem value="TITULAR">Titular</SelectItem>
                <SelectItem value="FILHO">Filho</SelectItem>
                <SelectItem value="CONJUGE">Cônjuge</SelectItem>
                <SelectItem value="DEPENDENTE">Dependente (Filho/Cônjuge)</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={normalizeStatus(statusParam) ?? "ALL"}
              onValueChange={(v) => pushParams({ status: v === "ALL" ? undefined : v })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Status (Todos)</SelectItem>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="INATIVO">Inativo</SelectItem>
              </SelectContent>
            </Select>

            <AlertDialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={selected.size === 0} aria-busy={deleteMany.isPending}>Excluir ({selected.size})</Button>
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

            <Button variant="outline" onClick={handleImportClick} disabled={uploadMutation.isPending} aria-busy={uploadMutation.isPending}>
              {uploadMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</>) : (<><Upload className="mr-2 h-4 w-4" /> Importar</>)}
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewOpen(true)}
              disabled={uploadMutation.isPending || !uploadResult}
              title={!uploadResult ? 'Importe um arquivo para ver o resumo' : undefined}
            >
              Resumo rápido (modal)
              {uploadResult?.errors?.length ? (
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">{uploadResult.errors.length}</span>
              ) : null}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => openFullImportPage(uploadResult?.runId)}
              disabled={uploadMutation.isPending || !uploadResult?.runId}
              title="Abrir página completa de evidências de importação"
            >
              Ver evidências (página)
            </Button>

            <Button asChild><Link href={`/health/${clienteId}/beneficiaries/new`}><PlusCircle className="mr-2 h-4 w-4" /> Novo</Link></Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 h-4" />Colunas</Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-[60vh] overflow-auto">
                {Object.entries(columnCategories).map(([category, cols]) => (
                  <React.Fragment key={category}>
                    {category !== "Outros" && (
                      <>
                        <DropdownMenuLabel>{category}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {(cols as { key: ColumnKey; label: string }[]).map((c) => (
                      <DropdownMenuCheckboxItem key={c.key} checked={visibleCols.has(c.key)} onCheckedChange={() => toggleCol(c.key)} disabled={c.key === "select" || c.key === "actions"}>
                        {c.label || (c.key as string)}
                      </DropdownMenuCheckboxItem>
                    ))}
                    <DropdownMenuSeparator />
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Modal de revisão */}
        <ImportReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          result={uploadResult}
          onOpenFullPage={openFullImportPage}
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
                  {stats.totalTitulares} <span className="text-base font-normal">Titulares</span> / {stats.totalDependentes} <span className="text-base font-normal">Dependentes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total de vidas</p>
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
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          {isVisible("select") && <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={(v) => toggleSelectAll(Boolean(v))} /></TableHead>}
                          {isVisible("nomeCompleto") && <TableHead>Nome</TableHead>}
                          {isVisible("cpf") && <TableHead>CPF</TableHead>}
                          {isVisible("tipo") && <TableHead>Tipo</TableHead>}
                          {isVisible("status") && <TableHead>Status</TableHead>}

                          {isVisible("sexo") && <TableHead>Sexo</TableHead>}
                          {isVisible("idade") && <TableHead>Idade</TableHead>}
                          {isVisible("dataNascimento") && <TableHead>Nascimento</TableHead>}
                          {isVisible("faixaEtaria") && <TableHead>Faixa Etária</TableHead>}

                          {isVisible("dataEntrada") && <TableHead>Vigência</TableHead>}
                          {isVisible("plano") && <TableHead>Plano</TableHead>}
                          {isVisible("centroCusto") && <TableHead>Centro de Custo</TableHead>}
                          {isVisible("matricula") && <TableHead>Matrícula</TableHead>}
                          {isVisible("carteirinha") && <TableHead>Carteirinha</TableHead>}
                          {isVisible("estado") && <TableHead>UF</TableHead>}
                          {isVisible("contrato") && <TableHead>Contrato</TableHead>}

                          {isVisible("dataSaida") && <TableHead>Saída</TableHead>}
                          {isVisible("regimeCobranca") && <TableHead>Regime Cobrança</TableHead>}
                          {isVisible("motivoMovimento") && <TableHead>Motivo Movimento</TableHead>}

                          {isVisible("valorMensalidade") && <TableHead>Mensalidade</TableHead>}
                          {isVisible("observacoes") && <TableHead>Observações</TableHead>}

                          {isVisible("titular") && <TableHead>Titular</TableHead>}
                          {isVisible("comentario") && <TableHead>Observação/Ação</TableHead>}

                          {CSV_COLUMNS.map((c) =>
                            isVisible(c.key as ColumnKey) ? (
                              <TableHead key={c.key}>{c.label}</TableHead>
                            ) : null
                          )}

                          {isVisible("actions") && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rowsWithAge.map((b) => {
                          const ai = (b as any)._ai as AgeInfo;
                          const bg = rowBgByAlert(ai.alert);
                          const showTooltip = ai.alert === "high" || ai.alert === "moderate";
                          const tooltipMsg =
                            ai.monthsUntilBandChange != null && ai.monthsUntilBandChange >= 0
                              ? `Muda de faixa em ${ai.monthsUntilBandChange} ${ai.monthsUntilBandChange === 1 ? "mês" : "meses"}${ai.nextBandChangeDate ? ` (${DT.format(ai.nextBandChangeDate)})` : ""}`
                              : "Sem mudança de faixa prevista";
                          const dependente = !isTitular(b.tipo);
                          const cpfDisplay = getDisplayCpf(b);

                          return (
                            <TableRow
                              key={b.id}
                              onClick={() => router.push(`/health/${clienteId}/beneficiaries/${b.id}`)}
                              className={`${bg} cursor-pointer`}
                              tabIndex={0}
                              role="button"
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/health/${clienteId}/beneficiaries/${b.id}`); } }}
                            >
                              {isVisible("select") && (
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox checked={selected.has(b.id)} onCheckedChange={(v) => toggleOne(b.id, Boolean(v))} />
                                </TableCell>
                              )}
                              {isVisible("nomeCompleto") && (
                                <TableCell className={`font-medium ${dependente ? "pl-10" : ""}`}>
                                  {dependente && "↳ "}
                                  {b.nomeCompleto}
                                </TableCell>
                              )}
                              {isVisible("cpf") && (
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span>{cpfDisplay.value}</span>
                                    {cpfDisplay.origin === 'dep' && (
                                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">dep</span>
                                    )}
                                    {cpfDisplay.origin === 'operadora' && (
                                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground" title="CPF vindo do layout/operadora">op</span>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                              {isVisible("tipo") && <TableCell>{tipoLabel(b.tipo)}</TableCell>}
                              {isVisible("status") && <TableCell>{statusLabel(b.status)}</TableCell>}

                              {isVisible("sexo") && <TableCell>{b.sexo ?? "—"}</TableCell>}
                              {isVisible("idade") && (
                                <TableCell>
                                  {showTooltip ? (
                                    <Tooltip>
                                      <TooltipTrigger className="text-left font-normal" asChild>
                                        <div className="flex items-center gap-2">
                                          <span>{b.idade ?? "—"}</span>
                                          {ai.alert === "high" && <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                                          {ai.alert === "moderate" && <div className="h-2 w-2 rounded-full bg-yellow-400" />}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>{tooltipMsg}</TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    b.idade ?? "—"
                                  )}
                                </TableCell>
                              )}
                              {isVisible("dataNascimento") && <TableCell>{formatMaybeDate(b.dataNascimento)}</TableCell>}
                              {isVisible("faixaEtaria") && <TableCell>{(b as any)._bandLabel ?? "—"}</TableCell>}

                              {isVisible("dataEntrada") && <TableCell>{formatDate(b.dataEntrada)}</TableCell>}
                              {isVisible("plano") && <TableCell>{b.plano ?? "—"}</TableCell>}
                              {isVisible("centroCusto") && <TableCell>{b.centroCusto ?? "—"}</TableCell>}
                              {isVisible("matricula") && <TableCell>{b.matricula ?? "—"}</TableCell>}
                              {isVisible("carteirinha") && <TableCell>{b.carteirinha ?? "—"}</TableCell>}
                              {isVisible("estado") && <TableCell>{b.estado ?? "—"}</TableCell>}
                              {isVisible("contrato") && <TableCell>{b.contrato ?? "—"}</TableCell>}

                              {isVisible("dataSaida") && <TableCell>{formatDate(b.dataSaida)}</TableCell>}
                              {isVisible("regimeCobranca") && <TableCell>{b.regimeCobranca ?? "—"}</TableCell>}
                              {isVisible("motivoMovimento") && <TableCell>{b.motivoMovimento ?? "—"}</TableCell>}

                              {isVisible("valorMensalidade") && <TableCell>{b.valorMensalidade != null ? brl(b.valorMensalidade) : "—"}</TableCell>}
                              {isVisible("observacoes") && <TableCell>{b.observacoes ?? "—"}</TableCell>}

                              {isVisible("titular") && <TableCell>{b.titularNome ?? "—"}</TableCell>}
                              {isVisible("comentario") && <TableCell>{b.comentario ?? "—"}</TableCell>}

                              {CSV_COLUMNS.map((c) => {
                                if (!isVisible(c.key as ColumnKey)) return null;
                                const raw = (b as any)[c.field] as string | null | undefined;
                                const val = c.isDate ? formatMaybeDate(raw) : (raw ?? "—");
                                return <TableCell key={c.key}>{val || "—"}</TableCell>;
                              })}

                              {isVisible("actions") && (
                                <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                                  <RowActions id={b.id} clienteId={clienteId} />
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                        {rowsWithAge.length === 0 && !isFetching && (
                          <TableRow><TableCell colSpan={ALL_COLUMNS.length} className="h-24 text-center text-muted-foreground">Nenhum beneficiário encontrado.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
