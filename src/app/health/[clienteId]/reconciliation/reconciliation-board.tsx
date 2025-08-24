'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';

// Charts
import {
  ResponsiveContainer,
  PieChart, Pie, Cell,
  Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------- tipos ----------
type ReconResp = {
  ok: boolean;
  clientId: string;
  mesReferencia: string;
  totals: {
    faturaCount: number;
    faturaSum: string;
    ativosCount: number;
    onlyInInvoice: number;
    onlyInRegistry: number;
    mismatched: number;
    duplicates: number;
  };
  filtersApplied: { tipo?: 'TITULAR'|'DEPENDENTE'; plano?: string; centro?: string };
  tabs: {
    onlyInInvoice: Array<{ cpf: string; nome: string; valorCobrado: string }>;
    onlyInRegistry: Array<{ cpf: string; nome: string; valorMensalidade: string }>;
    mismatched: Array<{ cpf: string; nome: string; valorCobrado: string; valorMensalidade: string; diferenca: string }>;
    duplicates: Array<{ cpf: string; nome: string; ocorrencias: number; somaCobrada: string; valores: string[] }>;
  };
};

type OptionsResp = {
  tipos: Array<'TITULAR'|'DEPENDENTE'>;
  planos: string[];
  centros: string[];
};

type RowVariant = 'ok' | 'error' | undefined;
const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
const ALL_TOKEN = '__ALL__';

// ---------- MonthPicker (muda só mês/ano) ----------
function ymToDate(ym?: string): Date | undefined {
  if (!ym) return undefined;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return undefined;
  return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
}
function dateToYm(d?: Date): string {
  if (!d) return '';
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function MonthPicker({
  value,
  onChange,
  label = 'Mês de referência',
}: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const selected = ymToDate(value) || new Date();
  // limite opcional (evita navegar muito longe)
  const fromYear = selected.getUTCFullYear() - 3;
  const toYear = selected.getUTCFullYear() + 1;

  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[220px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
            {format(selected, 'MMMM yyyy', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2" align="start">
          <Calendar
            mode="single"
            selected={selected}
            // react-day-picker seleciona dia; normalizamos para 1º dia do mês
            onSelect={(d) => {
              if (d) {
                const ym = dateToYm(d);
                onChange(ym);
                setOpen(false);
              }
            }}
            month={selected}
            onMonthChange={(m) => onChange(dateToYm(m))}
            captionLayout="dropdown" 
            fromDate={new Date(fromYear, 0, 1)}
            toDate={new Date(toYear, 11, 1)}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ---------- pequenos componentes ----------
function StatCard({ title, value, hint }: { title: string; value: string|number; hint?: string }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function ReconTable({
  columns, rows, getRowVariant, emphasizeCols = [],
}: {
  columns: string[];
  rows: Array<(string | number)[]>;
  getRowVariant?: (row: (string | number)[], index: number) => RowVariant;
  emphasizeCols?: number[];
}) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (<TableHead key={c}>{c}</TableHead>))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground">
                Nenhum registro para exibir.
              </TableCell>
            </TableRow>
          ) : rows.map((r, i) => {
              const variant = getRowVariant?.(r, i);
              const rowClass = variant === 'error' ? 'bg-red-50/70 hover:bg-red-50'
                             : variant === 'ok' ? 'bg-emerald-50/70 hover:bg-emerald-50' : undefined;
              return (
                <TableRow key={i} className={rowClass}>
                  {r.map((cell, j) => {
                    const emphasize = emphasizeCols.includes(j) && (variant === 'error' || variant === 'ok');
                    const emphasizeClass = variant === 'error' ? 'font-semibold text-red-700'
                                          : variant === 'ok' ? 'font-semibold text-emerald-700' : undefined;
                    return (
                      <TableCell key={`${i}-${j}`} className={cx(j >= columns.length - 2 ? 'text-right' : '', emphasize ? emphasizeClass : '')}>
                        {String(cell)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          }
        </TableBody>
      </Table>
    </div>
  );
}

// ---------- página ----------
export default function ReconciliationBoard() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const sp = useSearchParams();
  const mesParam = sp.get('mes') || '';
  const [mes, setMes] = React.useState(mesParam);
  const [activeTab, setActiveTab] = React.useState<'mismatched'|'onlyInInvoice'|'onlyInRegistry'|'duplicates'>('mismatched');
  const [format, setFormat] = React.useState<'xlsx'|'csv'>('xlsx');

  // filtros
  const [tipo, setTipo] = React.useState<'ALL'|'TITULAR'|'DEPENDENTE'>('ALL');
  const [plano, setPlano] = React.useState<string>('');   // '' = Todos
  const [centro, setCentro] = React.useState<string>(''); // '' = Todos

  const { data: options } = useQuery<OptionsResp>({
    queryKey: ['recon.options', clienteId],
    queryFn: () => apiFetch<OptionsResp>(`/clients/${clienteId}/reconciliation/options`),
  });

  const { data, isLoading, isError, refetch } = useQuery<ReconResp>({
    queryKey: ['recon.v1', clienteId, mes || 'current', tipo, plano, centro],
    queryFn: () => {
      const params = new URLSearchParams();
      if (mes) params.set('mes', mes);
      if (tipo && tipo !== 'ALL') params.set('tipo', tipo);
      if (plano) params.set('plano', plano);
      if (centro) params.set('centro', centro);
      const qs = params.toString();
      return apiFetch<ReconResp>(`/clients/${clienteId}/reconciliation${qs ? `?${qs}` : ''}`);
    },
  });

  // Excluir fatura do mês atual
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const mesYYYYMM = (data?.mesReferencia || '').slice(0, 7); // YYYY-MM
      if (!mesYYYYMM) throw new Error('Mês de referência indisponível.');
      const url = `/clients/${clienteId}/invoices?mes=${mesYYYYMM}`;
      return apiFetch<any>(url, { method: 'DELETE' });
    },
    onSuccess: (resp) => {
      toast.success(resp?.message || 'Fatura removida com sucesso.');
      refetch();
    },
    onError: (e: any) => {
      toast.error('Falha ao remover fatura.', { description: e?.message || 'Tente novamente.' });
    },
  });

  const buildExportUrl = (tab: string) => {
    const params = new URLSearchParams();
    if (mes) params.set('mes', mes);
    params.set('format', format);
    params.set('tab', tab);
    if (tipo && tipo !== 'ALL') params.set('tipo', tipo);
    if (plano) params.set('plano', plano);
    if (centro) params.set('centro', centro);
    return `/clients/${clienteId}/reconciliation/export?${params.toString()}`;
  };

  // ---------- gráficos ----------
  const pieData = React.useMemo(() => {
    if (!data) return [];
    const { mismatched, duplicates, onlyInInvoice, onlyInRegistry, ativosCount } = data.totals;
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
    ok: '#10B981',       // emerald-500
    mismatch: '#EF4444', // red-500
    dup: '#F59E0B',      // amber-500
    inv: '#3B82F6',      // blue-500
    reg: '#8B5CF6',      // violet-500
  };

  const safeList = (arr?: (string | null)[]) =>
    (arr || []).filter((x): x is string => !!x && x.trim().length > 0);

  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Título + info */}
          <div className="flex items-start gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">Conciliação da Fatura</CardTitle>
              {isLoading ? (
                <div className="mt-2 space-y-1">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-72" />
                </div>
              ) : data ? (
                <div className="text-sm mt-2">
                  <div><span className="font-medium">Mês de referência:</span> {data.mesReferencia}</div>
                  <div>
                    <span className="font-medium">Itens importados:</span> {data.totals.faturaCount} —{' '}
                    <span className="font-medium">Soma:</span> {data.totals.faturaSum} —{' '}
                    <span className="font-medium">Beneficiários ativos:</span> {data.totals.ativosCount}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Legenda compacta */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="mt-1 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent" aria-label="Legenda de cores">
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
                  <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-emerald-500" /> <span>Conformes</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-red-500" /> <span>Divergentes</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-amber-500" /> <span>Duplicados</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-blue-500" /> <span>Só na fatura</span></div>
                  <div className="flex items-center gap-2 text-sm"><span className="h-2 w-2 rounded-full bg-violet-500" /> <span>Só no cadastro</span></div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Controles mais visíveis */}
          <div className="grid w-full gap-3 md:w-auto md:grid-cols-5 items-end">
            <MonthPicker value={mes} onChange={setMes} />

            <div className="grid gap-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="TITULAR">Titular</SelectItem>
                  <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Plano</Label>
              <Select
                value={plano ? plano : ALL_TOKEN}
                onValueChange={(v) => setPlano(v === ALL_TOKEN ? '' : v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TOKEN}>Todos</SelectItem>
                  {safeList(options?.planos).map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Centro de custo</Label>
              <Select
                value={centro ? centro : ALL_TOKEN}
                onValueChange={(v) => setCentro(v === ALL_TOKEN ? '' : v)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Centro de custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TOKEN}>Todos</SelectItem>
                  {safeList(options?.centros).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => refetch()} className="w-[110px]">Aplicar</Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-[160px]"
                    disabled={isLoading || !data || data.totals.faturaCount === 0 || deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Excluindo...' : 'Excluir fatura do mês'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir fatura importada?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação removerá todas as linhas importadas para o mês <strong>{data?.mesReferencia?.slice(0,7) || '—'}</strong> deste cliente.
                      Essa operação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirmar exclusão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full col-span-1 md:col-span-2" />
              <Skeleton className="h-64 w-full col-span-1 md:col-span-2" />
            </div>
          ) : isError || !data ? (
            <div className="text-sm text-destructive">Falha ao carregar a conciliação.</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <StatCard title="Beneficiários (filtrados)" value={data.totals.ativosCount} />
                <StatCard title="Itens importados" value={data.totals.faturaCount} hint={data.totals.faturaSum} />
                <StatCard title="Divergentes" value={data.totals.mismatched} />
                <StatCard title="Duplicados" value={data.totals.duplicates} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Distribuição de casos</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <RechartsTooltip />
                        <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} paddingAngle={2}>
                          {pieData.map((entry, i) => (<Cell key={i} fill={pieColors[entry.key] || '#999'} />))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Detalhe de divergências</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" /><YAxis allowDecimals={false} /><RechartsTooltip />
                        <Bar dataKey="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Export */}
              <div className="mt-2 mb-3 flex items-center gap-2">
                <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Formato" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
                <a href={buildExportUrl(activeTab)} rel="noopener" className="inline-block"><Button>Exportar aba atual</Button></a>
                <a href={buildExportUrl('all')} rel="noopener" className="inline-block"
                   onClick={(e) => { if (format === 'csv') { e.preventDefault(); alert('CSV não suporta exportar "Todas". Selecione XLSX ou escolha uma aba específica.'); } }}>
                  <Button variant="secondary">Exportar todas (XLSX)</Button>
                </a>
              </div>

              {/* Abas */}
              <Tabs defaultValue="mismatched" onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="mismatched">Divergentes ({data.totals.mismatched})</TabsTrigger>
                  <TabsTrigger value="onlyInInvoice">Só na fatura ({data.totals.onlyInInvoice})</TabsTrigger>
                  <TabsTrigger value="onlyInRegistry">Só no cadastro ({data.totals.onlyInRegistry})</TabsTrigger>
                  <TabsTrigger value="duplicates">Duplicados ({data.totals.duplicates})</TabsTrigger>
                </TabsList>

                <TabsContent value="mismatched">
                  <ReconTable
                    columns={['Beneficiário','CPF','Cobrado','Mensalidade','Diferença']}
                    rows={data.tabs.mismatched.map((r) => [r.nome, r.cpf, r.valorCobrado, r.valorMensalidade, r.diferenca])}
                    getRowVariant={() => 'error'}
                    emphasizeCols={[4]}
                  />
                </TabsContent>

                <TabsContent value="onlyInInvoice">
                  <ReconTable
                    columns={['Beneficiário','CPF','Valor Cobrado']}
                    rows={data.tabs.onlyInInvoice.map((r) => [r.nome, r.cpf, r.valorCobrado])}
                  />
                </TabsContent>

                <TabsContent value="onlyInRegistry">
                  <ReconTable
                    columns={['Beneficiário','CPF','Mensalidade']}
                    rows={data.tabs.onlyInRegistry.map((r) => [r.nome, r.cpf, r.valorMensalidade])}
                  />
                </TabsContent>

                <TabsContent value="duplicates">
                  <ReconTable
                    columns={['Beneficiário','CPF','Ocorrências','Soma cobrada','Valores']}
                    rows={data.tabs.duplicates.map((r) => [r.nome, r.cpf, String(r.ocorrencias), r.somaCobrada, r.valores.join(', ')])}
                    getRowVariant={() => 'error'}
                    emphasizeCols={[4]}
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
