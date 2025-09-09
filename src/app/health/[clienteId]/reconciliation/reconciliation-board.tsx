'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Components
import {
  ReconTable,
  type ColumnDef,
  type RowVariant,
} from '@/components/reconciliation/recon-table';
import { StatCard } from '@/components/reconciliation/stat-card';
import {
  DistributionPieCard,
  DivergencesBarCard,
} from '@/components/reconciliation/recon-charts';
import { ReconFilters } from '@/components/reconciliation/recon-filters';
import { ReconActions } from '@/components/reconciliation/recon-actions';

// ===================== tipos =====================
type ReconResp = {
  ok: boolean;
  clientId: string;
  mesReferencia: string; // YYYY-MM-01 (slice(0,7) -> YYYY-MM)
  totals: {
    faturaCount: number;
    faturaSum: string; // BRL
    ativosCount: number;
    onlyInInvoice: number;
    onlyInRegistry: number;
    mismatched: number;
    duplicates: number;
  };
  filtersApplied: {
    tipo?: 'TITULAR' | 'DEPENDENTE';
    plano?: string;
    centro?: string;
  };
  tabs: {
    onlyInInvoice: Array<{
      id: string;
      cpf: string;
      nome: string;
      valorCobrado: string;
    }>;
    onlyInRegistry: Array<{
      id: string;
      cpf: string;
      nome: string;
      valorMensalidade: string;
    }>;
    mismatched: Array<{
      id: string;
      cpf: string;
      nome: string;
      valorCobrado: string;
      valorMensalidade: string;
      diferenca: string;
    }>;
    duplicates: Array<{
      id: string;
      cpf: string;
      nome: string;
      ocorrencias: number;
      somaCobrada: string;
      valores: string[];
    }>;
    allInvoice: Array<{
      id: string;
      cpf: string;
      nome: string;
      valorCobrado: string;
      valorMensalidade: string;
      diferenca: string;
      status: 'OK' | 'DIVERGENTE' | 'DUPLICADO' | 'SOFATURA';
    }>;
  };
  closure?: {
    status: 'OPEN' | 'CLOSED';
    totalFatura?: string; // BRL
    closedAt?: string; // ISO
    notes?: string | null;
  };
};

type OptionsResp = {
  tipos: Array<'TITULAR' | 'DEPENDENTE'>;
  planos: string[];
  centros: string[];
};

const ALL_TOKEN = '__ALL__';

// ===================== utils de moeda =====================
const parseCurrency = (v: string | number | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const raw = String(v).replace(/[^\d.,\-]/g, '');
  if (!raw) return 0;
  return raw.includes(',')
    ? Number(raw.replace(/\./g, '').replace(',', '.')) || 0
    : Number(raw) || 0;
};
const toBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ===================== helpers de mês =====================
function dateToYm(d?: Date): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

// ===================== página =====================
export default function ReconciliationBoard() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const sp = useSearchParams();

  const mesParam = sp.get('mes') || '';
  const insurerId = sp.get('insurerId') || ''; // vazio = todas

  // mês atual como fallback
  const defaultYm = React.useMemo(() => dateToYm(new Date()), []);
  const [mes, setMes] = React.useState<string>(mesParam || defaultYm);

  React.useEffect(() => {
    if (!mesParam) {
      const params = new URLSearchParams(window.location.search);
      params.set('mes', mes);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (mesParam && mesParam !== mes) setMes(mesParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesParam]);

  const handleMesChange = React.useCallback((v: string) => {
    setMes(v);
    const params = new URLSearchParams(window.location.search);
    params.set('mes', v);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, []);

  const [activeTab, setActiveTab] = React.useState<
    | 'mismatched'
    | 'onlyInInvoice'
    | 'onlyInRegistry'
    | 'duplicates'
    | 'okInvoice'
    | 'allInvoice'
  >('mismatched');
  const [exportFormat, setExportFormat] =
    React.useState<'xlsx' | 'csv'>('xlsx');

  // filtros
  const [tipo, setTipo] =
    React.useState<'ALL' | 'TITULAR' | 'DEPENDENTE'>('ALL');
  const [plano, setPlano] = React.useState<string>('');
  const [centro, setCentro] = React.useState<string>('');

  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<string[]>(
    [],
  );

  // 🔎 BUSCA LOCAL (debounced)
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setSelectedInvoiceIds([]);
  }, [activeTab, mes, tipo, plano, centro, debouncedSearch, insurerId]);

  const { data: options } = useQuery<OptionsResp>({
    queryKey: ['recon.options', clienteId],
    queryFn: () =>
      apiFetch<OptionsResp>(
        `/clients/${clienteId}/reconciliation/options`,
      ),
  });

  const { data, isLoading, isError, refetch } = useQuery<ReconResp>({
    queryKey: [
      'recon.v1',
      clienteId,
      mes,
      tipo,
      plano,
      centro,
      insurerId || '__ALL__',
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('mes', mes);
      if (tipo && tipo !== 'ALL') params.set('tipo', tipo);
      if (plano) params.set('plano', plano);
      if (centro) params.set('centro', centro);
      if (insurerId) params.set('insurerId', insurerId);
      return apiFetch<ReconResp>(
        `/clients/${clienteId}/reconciliation?${params.toString()}`,
      );
    },
  });

  // --- proteção contra data.tabs indefinido ----
  const tabs = React.useMemo(
    () =>
      data?.tabs ?? {
        onlyInInvoice: [],
        onlyInRegistry: [],
        mismatched: [],
        duplicates: [],
        allInvoice: [],
      },
    [data],
  );

  // Derivados e somatórios
  const okRows = React.useMemo(
    () => tabs.allInvoice.filter((r) => r.status === 'OK'),
    [tabs.allInvoice],
  );

  const allInvoiceTotal = React.useMemo(
    () => tabs.allInvoice.reduce((acc, r) => acc + parseCurrency(r.valorCobrado), 0),
    [tabs.allInvoice],
  );

  const allInvoiceSum = React.useMemo(() => toBRL(allInvoiceTotal), [allInvoiceTotal]);
  const onlyInInvoiceSum = React.useMemo(
    () => toBRL(tabs.onlyInInvoice.reduce((acc, r) => acc + parseCurrency(r.valorCobrado), 0)),
    [tabs.onlyInInvoice],
  );
  const okInvoiceSum = React.useMemo(
    () => toBRL(okRows.reduce((acc, r) => acc + parseCurrency(r.valorCobrado), 0)),
    [okRows],
  );

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const mesYYYYMM = (data?.mesReferencia || '').slice(0, 7);
      if (!mesYYYYMM) throw new Error('Mês de referência indisponível.');
      const p = new URLSearchParams();
      p.set('mes', mesYYYYMM);
      if (insurerId) p.set('insurerId', insurerId);
      const url = `/clients/${clienteId}/invoices?${p.toString()}`;
      return apiFetch<any>(url, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Fatura do mês excluída.');
      refetch();
    },
    onError: (e: unknown) => {
      toast.error('Falha ao excluir fatura.', {
        description: e instanceof Error ? e.message : String(e),
      });
    },
  });

  const reconcileMutation = useMutation({
    mutationFn: (invoiceIds: string[]) => {
      // rota antiga não precisa de insurerId; mantemos sem quebrar
      return apiFetch<any>(`/clients/${clienteId}/invoices/reconcile`, {
        method: 'PATCH',
        body: JSON.stringify({ invoiceIds }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (resp) => {
      toast.success(
        `${resp?.count ?? resp?.reconciledCount ?? 0} faturas conciliadas.`,
        { description: 'Os registros foram atualizados no sistema.' },
      );
      setSelectedInvoiceIds([]);
      refetch();
    },
    onError: (e: unknown) => {
      toast.error('Falha ao conciliar faturas.', {
        description: e instanceof Error ? e.message : String(e),
      });
    },
  });

  // Fechamento manual do mês (POST /clients/:id/reconciliation/close)
  const closeMutation = useMutation({
    mutationFn: async ({ total, notes }: { total: number; notes?: string }) => {
      const body: Record<string, any> = {
        mes,
        valorFaturaDeclarado: total,
        observacaoFechamento: notes?.trim() || undefined,
      };
      if (insurerId) body.insurerId = insurerId;
      return apiFetch<any>(
        `/clients/${clienteId}/reconciliation/close`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
    },
    onSuccess: () => {
      toast.success('Fechamento registrado com sucesso.');
      refetch();
    },
    onError: (e: unknown) => {
      toast.error('Falha ao fechar conciliação.', {
        description: e instanceof Error ? e.message : String(e),
      });
    },
  });

  // Charts
  const pieData = React.useMemo(() => {
    if (!data) return [];
    const { mismatched, duplicates, onlyInInvoice, onlyInRegistry, ativosCount } =
      data.totals;
    const divergentes = mismatched + onlyInInvoice + onlyInRegistry + duplicates;
    const conformes = Math.max(0, ativosCount - divergentes);
    return [
      { name: 'Conformes', value: conformes, key: 'ok' },
      { name: 'Divergentes', value: mismatched, key: 'mismatch' },
      { name: 'Duplicados', value: duplicates, key: 'dup' },
      { name: 'Só na fatura', value: onlyInInvoice, key: 'inv' },
      { name: 'Só no cadastro', value: onlyInRegistry, key: 'reg' },
    ];
  }, [data]);

  const barData = React.useMemo(() => {
    if (!data) return [];
    const t = data.totals;
    return [
      { label: 'Divergentes', value: t.mismatched },
      { label: 'Duplicados', value: t.duplicates },
      { label: 'Só na fatura', value: t.onlyInInvoice },
      { label: 'Só no cadastro', value: t.onlyInRegistry },
    ];
  }, [data]);

  const pieColors: Record<string, string> = {
    ok: '#10B981',
    mismatch: '#EF4444',
    dup: '#F59E0B',
    inv: '#3B82F6',
    reg: '#8B5CF6',
  };

  const handleSelectChange = React.useCallback((id: string, isChecked: boolean) => {
    setSelectedInvoiceIds((prev) => {
      if (isChecked) return Array.from(new Set([...prev, id]));
      return prev.filter((_id) => _id !== id);
    });
  }, []);

  // Filtro local por busca
  const filterPredicate = React.useCallback(
    (row: any) => {
      if (!debouncedSearch) return true;
      const q = debouncedSearch.toLowerCase();

      const nome = (row.nome ?? '').toString().toLowerCase();
      const cpfDigits = (row.cpf ?? '').toString().replace(/\D/g, '');
      const qDigits = q.replace(/\D/g, '');

      const valorCobradoNum = parseCurrency(row.valorCobrado);
      const valorMensalidadeNum = parseCurrency(row.valorMensalidade);
      const diferencaNum = parseCurrency(row.diferenca);

      if (nome.includes(q)) return true;
      if (qDigits && cpfDigits.includes(qDigits)) return true;

      const tryNum = Number(q.replace('.', '').replace(',', '.'));
      if (!Number.isNaN(tryNum)) {
        const tol = 0.02; // ~2 centavos
        if (Math.abs(valorCobradoNum - tryNum) <= tol) return true;
        if (Math.abs(valorMensalidadeNum - tryNum) <= tol) return true;
        if (Math.abs(diferencaNum - tryNum) <= tol) return true;
      }

      return false;
    },
    [debouncedSearch],
  );

  const filteredTabs = React.useMemo(() => {
    if (!debouncedSearch) return tabs;
    return {
      mismatched: tabs.mismatched.filter(filterPredicate),
      onlyInInvoice: tabs.onlyInInvoice.filter(filterPredicate),
      onlyInRegistry: tabs.onlyInRegistry.filter(filterPredicate),
      duplicates: tabs.duplicates.filter(filterPredicate),
      allInvoice: tabs.allInvoice.filter(filterPredicate),
    };
  }, [tabs, debouncedSearch, filterPredicate]);

  const filteredOkRows = React.useMemo(
    () => filteredTabs.allInvoice.filter((r) => r.status === 'OK'),
    [filteredTabs.allInvoice],
  );

  // Column defs
  const colsMismatch: ColumnDef<any>[] = [
    { header: 'Beneficiário', key: 'nome' },
    { header: 'CPF', key: 'cpf' },
    { header: 'Cobrado', key: 'valorCobrado', align: 'right', emphasize: true },
    { header: 'Mensalidade', key: 'valorMensalidade', align: 'right' },
    { header: 'Diferença', key: 'diferenca', align: 'right', emphasize: true },
  ];
  const colsOnlyInv: ColumnDef<any>[] = [
    { header: 'Beneficiário', key: 'nome' },
    { header: 'CPF', key: 'cpf' },
    { header: 'Valor Cobrado', key: 'valorCobrado', align: 'right' },
  ];
  const colsOnlyReg: ColumnDef<any>[] = [
    { header: 'Beneficiário', key: 'nome' },
    { header: 'CPF', key: 'cpf' },
    { header: 'Mensalidade', key: 'valorMensalidade', align: 'right' },
  ];
  const colsDup: ColumnDef<any>[] = [
    { header: 'Beneficiário', key: 'nome' },
    { header: 'CPF', key: 'cpf' },
    { header: 'Ocorrências', key: 'ocorrencias', align: 'right' },
    { header: 'Soma cobrada', key: 'somaCobrada', align: 'right', emphasize: true },
    { header: 'Valores', key: 'valores' },
  ];
  const colsAll: ColumnDef<any>[] = [
    { header: 'Beneficiário', key: 'nome' },
    { header: 'CPF', key: 'cpf' },
    { header: 'Cobrado', key: 'valorCobrado', align: 'right' },
    { header: 'Mensalidade', key: 'valorMensalidade', align: 'right' },
    { header: 'Diferença', key: 'diferenca', align: 'right', emphasize: true },
    { header: 'Status', key: 'status' },
  ];

  const isClosed = data?.closure?.status === 'CLOSED';
  const suggestedCloseBRL = allInvoiceSum;

  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Conciliação da Fatura
              </CardTitle>
              {isLoading ? (
                <div className="mt-2 space-y-1">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-72" />
                </div>
              ) : data ? (
                <div className="text-sm mt-2">
                  <div>
                    <span className="font-medium">Mês de referência:</span>{' '}
                    {data.mesReferencia}
                  </div>
                  <div>
                    <span className="font-medium">Itens importados:</span>{' '}
                    {data.totals.faturaCount} —{' '}
                    <span className="font-medium">Soma:</span>{' '}
                    {data.totals.faturaSum} —{' '}
                    <span className="font-medium">Beneficiários ativos:</span>{' '}
                    {data.totals.ativosCount}
                  </div>
                </div>
              ) : null}
            </div>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    aria-label="Legenda de cores"
                  >
                    Legenda
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="h-2 w-2 rounded-full bg-violet-500" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />{' '}
                    <span>Conformes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-red-500" />{' '}
                    <span>Divergentes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />{' '}
                    <span>Duplicados</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />{' '}
                    <span>Só na fatura</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-violet-500" />{' '}
                    <span>Só no cadastro</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <ReconFilters
            mes={mes}
            onMesChange={handleMesChange}
            tipo={tipo}
            onTipoChange={setTipo}
            plano={plano}
            onPlanoChange={setPlano}
            centro={centro}
            onCentroChange={setCentro}
            options={options}
            allToken={ALL_TOKEN}
          />
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full col-span-1 md:col-span-2" />
              <Skeleton className="h-64 w-full col-span-1 md:col-span-2" />
            </div>
          ) : isError || !data ? (
            <div className="text-sm text-destructive">
              Falha ao carregar a conciliação.
            </div>
          ) : (
            <>
              {/* KPIs principais */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <StatCard
                  title="Beneficiários (filtrados)"
                  value={data.totals.ativosCount}
                />
                <StatCard
                  title="Itens importados"
                  value={data.totals.faturaCount}
                  hint={data.totals.faturaSum}
                />
                <StatCard
                  title="Divergentes"
                  value={data.totals.mismatched}
                />
                <StatCard title="Duplicados" value={data.totals.duplicates} />
              </div>

              {/* Cards financeiros da fatura */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <StatCard
                  title="Fatura (todos)"
                  value={allInvoiceSum}
                  hint={`${tabs.allInvoice.length} itens`}
                />
                <StatCard
                  title="Convergentes (OK)"
                  value={okInvoiceSum}
                  hint={`${okRows.length} itens`}
                />
                <StatCard
                  title="Só na fatura"
                  value={onlyInInvoiceSum}
                  hint={`${tabs.onlyInInvoice.length} itens`}
                />
              </div>

              {/* Barra de ações */}
              <ReconActions
                exportFormat={exportFormat}
                onExportFormatChange={setExportFormat}
                activeTab={activeTab}
                buildExportUrl={(tab) => {
                  const params = new URLSearchParams();
                  params.set('mes', mes);
                  params.set('format', exportFormat);
                  params.set('tab', tab);
                  if (tipo && tipo !== 'ALL') params.set('tipo', tipo);
                  if (plano) params.set('plano', plano);
                  if (centro) params.set('centro', centro);
                  if (insurerId) params.set('insurerId', insurerId);
                  return `/clients/${clienteId}/reconciliation/export?${params.toString()}`;
                }}
                search={search}
                onSearchChange={setSearch}
                isLoading={isLoading}
                hasInvoice={data.totals.faturaCount > 0}
                mesReferencia={data.mesReferencia}
                onDelete={() => deleteMutation.mutate()}
                deletePending={deleteMutation.isPending}
                onReconcile={() => reconcileMutation.mutate(selectedInvoiceIds)}
                canReconcile={selectedInvoiceIds.length > 0}
                reconcilePending={reconcileMutation.isPending}
                // --- fechamento manual ---
                canCloseMonth={data.totals.faturaCount > 0}
                isClosed={isClosed}
                suggestedTotal={allInvoiceTotal}
                onConfirmClose={({ total, notes }) =>
                  closeMutation.mutate({ total, notes })
                }
                closingPending={closeMutation.isPending}
              />

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DistributionPieCard data={pieData} colors={pieColors} />
                <DivergencesBarCard data={barData} />
              </div>

              {/* Abas + Tabelas */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full"
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="mismatched">
                    Divergentes ({filteredTabs.mismatched.length}/
                    {data.totals.mismatched})
                  </TabsTrigger>
                  <TabsTrigger value="onlyInInvoice">
                    Só na fatura ({filteredTabs.onlyInInvoice.length}/
                    {data.totals.onlyInInvoice})
                  </TabsTrigger>
                  <TabsTrigger value="onlyInRegistry">
                    Só no cadastro ({filteredTabs.onlyInRegistry.length}/
                    {data.totals.onlyInRegistry})
                  </TabsTrigger>
                  <TabsTrigger value="duplicates">
                    Duplicados ({filteredTabs.duplicates.length}/
                    {data.totals.duplicates})
                  </TabsTrigger>
                  <TabsTrigger value="okInvoice">
                    Convergentes (OK) ({filteredOkRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="allInvoice">
                    Fatura (todos) ({filteredTabs.allInvoice.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mismatched">
                  <ReconTable
                    columns={colsMismatch}
                    data={filteredTabs.mismatched}
                    getRowVariant={() => 'error' as RowVariant}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="onlyInInvoice">
                  <ReconTable
                    columns={colsOnlyInv}
                    data={filteredTabs.onlyInInvoice}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="onlyInRegistry">
                  <ReconTable
                    columns={colsOnlyReg}
                    data={filteredTabs.onlyInRegistry}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="duplicates">
                  <ReconTable
                    columns={colsDup}
                    data={filteredTabs.duplicates}
                    getRowVariant={() => 'error' as RowVariant}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="okInvoice">
                  <ReconTable
                    columns={colsAll}
                    data={filteredOkRows as any}
                    getRowVariant={() => 'ok' as RowVariant}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>

                <TabsContent value="allInvoice">
                  <ReconTable
                    columns={colsAll}
                    data={filteredTabs.allInvoice}
                    getRowVariant={(row) => {
                      const status = row.status;
                      if (status === 'DIVERGENTE') return 'error';
                      if (status === 'OK') return 'ok';
                      return undefined;
                    }}
                    selectedIds={selectedInvoiceIds}
                    onSelectChange={handleSelectChange}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
