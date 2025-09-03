'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// chart
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

type Row = {
  mes: string; // 'YYYY-MM'
  status: 'OPEN' | 'CLOSED';
  closedAt?: string | null;
  totals: { declarado?: string; fatura?: string; ok?: string; onlyInInvoice?: string; };
  counts: {
    faturaCount: number; ativosCount: number; mismatched: number; duplicates: number;
    onlyInInvoice: number; onlyInRegistry: number; okCount: number;
  };
  notes?: string | null;
  signedBy?: { id: string; name?: string | null; email?: string | null };
};
type HistoryResp = {
  ok: true;
  clientId: string;
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
  rows: Row[];
  summary: {
    totalDeclarado: string;
    totalFatura: string;
    diferenca: string;
    closedCount: number;
    openCount: number;
  };
};

const ymToLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const parseBRL = (n: string) => {
  const raw = n.replace(/[^\d.,\-]/g, '');
  return raw.includes(',') ? Number(raw.replace(/\./g, '').replace(',', '.')) : Number(raw);
};
const toBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const currencyDiff = (a?: string, b?: string) => toBRL((parseBRL(a || '0') || 0) - (parseBRL(b || '0') || 0));

const LS_KEY = 'health.billing.history.filters';

export default function BillingHistoryPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();

  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-01`;
  const defaultTo = `${now.getFullYear()}-12`;

  // restora filtros do LS se não vierem na URL
  const sp = useSearchParams();
  const initialFrom = sp.get('from') ?? (typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(LS_KEY) || '{}')?.from ?? defaultFrom
    : defaultFrom);
  const initialTo = sp.get('to') ?? (typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(LS_KEY) || '{}')?.to ?? defaultTo
    : defaultTo);
  const initialStatus = (sp.get('status') as 'ALL' | 'OPEN' | 'CLOSED' | null) ??
    (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(LS_KEY) || '{}')?.status ?? 'ALL' : 'ALL');
  const initialLimit = Number(sp.get('limit') || (typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem(LS_KEY) || '{}')?.limit ?? 24
    : 24));

  const [from, setFrom] = React.useState(initialFrom);
  const [to, setTo] = React.useState(initialTo);
  const [status, setStatus] = React.useState<'ALL' | 'OPEN' | 'CLOSED'>(initialStatus || 'ALL');
  const [page, setPage] = React.useState<number>(Number(sp.get('page') || 1));
  const [limit, setLimit] = React.useState<number>(initialLimit);
  const [search, setSearch] = React.useState('');

  // persiste no LS
  React.useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ from, to, status, limit }));
    } catch {}
  }, [from, to, status, limit]);

  // sincroniza URL
  const pushUrl = React.useCallback(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status !== 'ALL') params.set('status', status);
    if (page !== 1) params.set('page', String(page));
    if (limit !== 24) params.set('limit', String(limit));
    router.replace(`?${params.toString()}`);
  }, [from, to, status, page, limit, router]);

  React.useEffect(() => { pushUrl(); }, [from, to, status, page, limit, pushUrl]);

  const { data, isLoading, isError, error, refetch } = useQuery<HistoryResp>({
    queryKey: ['recon.history', clienteId, from, to, status, page, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status !== 'ALL') params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return apiFetch<HistoryResp>(`/clients/${clienteId}/reconciliation/history?${params.toString()}`);
    },
    staleTime: 60_000,
  });

  // reabrir mês
  const reopenMutation = useMutation({
    mutationFn: async (ym: string) =>
      apiFetch(`/clients/${clienteId}/reconciliation/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mes: ym }),
      }),
    onSuccess: () => { toast.success('Conciliação reaberta.'); refetch(); },
    onError: (e: any) => toast.error('Falha ao reabrir.', { description: e?.message || String(e) }),
  });

  const filteredRows = React.useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data.rows;
    const q = search.toLowerCase();
    return data.rows.filter((r) => {
      const label = ymToLabel(r.mes).toLowerCase();
      return (
        r.mes.includes(q) ||
        label.includes(q) ||
        (r.totals.declarado ?? '').toLowerCase().includes(q) ||
        (r.totals.fatura ?? '').toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q) ||
        (r.signedBy?.name ?? r.signedBy?.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  const exportUrlXlsx = React.useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status !== 'ALL') params.set('status', status);
    params.set('format', 'xlsx');
    return `/clients/${clienteId}/reconciliation/history/export?${params.toString()}`;
  }, [clienteId, from, to, status]);

  const exportUrlCsv = React.useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status !== 'ALL') params.set('status', status);
    params.set('format', 'csv');
    return `/clients/${clienteId}/reconciliation/history/export?${params.toString()}`;
  }, [clienteId, from, to, status]);

  // série p/ gráfico
  const chartData = React.useMemo(() => {
    if (!filteredRows.length) return [];
    return [...filteredRows].sort((a, b) => a.mes.localeCompare(b.mes)).map((r) => ({
      ym: r.mes,
      label: ymToLabel(r.mes),
      declarado: r.totals.declarado ? parseBRL(r.totals.declarado) : 0,
      fatura: r.totals.fatura ? parseBRL(r.totals.fatura) : 0,
      diff: (r.totals.declarado ? parseBRL(r.totals.declarado) : 0) - (r.totals.fatura ? parseBRL(r.totals.fatura) : 0),
    }));
  }, [filteredRows]);

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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/health">Saúde</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>Faturamento</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="p-6 pt-0 space-y-6">
          <Card>
            <CardHeader><CardTitle>Faturamento — Histórico por mês</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">De (YYYY-MM)</label>
                  <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="YYYY-MM" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Até (YYYY-MM)</label>
                  <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="YYYY-MM" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="CLOSED">Fechados</SelectItem>
                      <SelectItem value="OPEN">Abertos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end justify-end gap-2">
                  <a href={exportUrlXlsx} className="w-full md:w-auto"><Button className="w-full">Exportar (XLSX)</Button></a>
                  <a href={exportUrlCsv} className="w-full md:w-auto"><Button variant="outline" className="w-full">CSV</Button></a>
                </div>
              </div>

              {/* KPIs + Gráfico */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : isError || !data ? (
                <div className="space-y-3">
                  <div className="text-sm text-destructive">Falha ao carregar.</div>
                  <div className="text-xs text-muted-foreground break-all">{String((error as any)?.message || error)}</div>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Kpi title="Total declarado" value={data.summary.totalDeclarado} />
                    <Kpi title="Soma faturas" value={data.summary.totalFatura} />
                    <Kpi title="Diferença" value={data.summary.diferenca} />
                    <Kpi title="Fechados / Abertos" value={`${data.summary.closedCount} / ${data.summary.openCount}`} />
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-xs text-muted-foreground mb-2">Tendência (valores em BRL)</div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis />
                          <Tooltip formatter={(v: number) => toBRL(v)} />
                          <Line type="monotone" dataKey="declarado" name="Declarado" dot={false} />
                          <Line type="monotone" dataKey="fatura" name="Fatura" dot={false} />
                          <Line type="monotone" dataKey="diff" name="Diferença" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                    <Input
                      placeholder="Buscar por mês, valor, observação ou assinante…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="md:w-96"
                    />
                    <div className="flex items-center gap-2">
                      <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                          <SelectItem value="48">48</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-sm text-muted-foreground">
                        Página {page} de {Math.max(1, Math.ceil((data.pagination.total || 1) / limit))}
                      </div>
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="rounded-lg border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <Th>Mês</Th>
                          <Th>Status</Th>
                          <Th className="text-right">Declarado</Th>
                          <Th className="text-right">Soma fatura</Th>
                          <Th className="text-right">Diferença</Th>
                          <Th className="text-center">Diverg.</Th>
                          <Th className="text-center">Dup.</Th>
                          <Th className="text-center">Só fatura</Th>
                          <Th className="text-center">Só cadastro</Th>
                          <Th className="text-center">Itens</Th>
                          <Th className="text-center">Ativos</Th>
                          <Th>Fechado em</Th>
                          <Th>Assinado por</Th>
                          <Th>Observações</Th>
                          <Th>Ações</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r) => {
                          const diffText = currencyDiff(r.totals.declarado, r.totals.fatura);
                          const negative = diffText.startsWith('-');
                          const signed = r.signedBy?.name ?? r.signedBy?.email ?? '—';

                          return (
                            <tr key={r.mes} className="border-t">
                              <Td>
                                <button
                                  className="text-left text-primary underline-offset-4 hover:underline"
                                  onClick={() => router.push(`/health/${clienteId}/reconciliation?mes=${r.mes}`)}
                                  title="Abrir conciliação do mês"
                                >
                                  {ymToLabel(r.mes)}
                                </button>
                              </Td>
                              <Td>
                                <Badge variant={r.status === 'CLOSED' ? 'default' : 'secondary'}>
                                  {r.status === 'CLOSED' ? 'Fechado' : 'Aberto'}
                                </Badge>
                              </Td>
                              <Td className="text-right">{r.totals.declarado ?? '—'}</Td>
                              <Td className="text-right">{r.totals.fatura ?? '—'}</Td>
                              <Td className={`text-right ${negative ? 'text-red-600' : 'text-emerald-600'}`}>
                                {r.totals.declarado && r.totals.fatura ? diffText : '—'}
                              </Td>
                              <Td className="text-center">{r.counts.mismatched}</Td>
                              <Td className="text-center">{r.counts.duplicates}</Td>
                              <Td className="text-center">{r.counts.onlyInInvoice}</Td>
                              <Td className="text-center">{r.counts.onlyInRegistry}</Td>
                              <Td className="text-center">{r.counts.faturaCount}</Td>
                              <Td className="text-center">{r.counts.ativosCount}</Td>
                              <Td>{r.closedAt ? new Date(r.closedAt).toLocaleString('pt-BR') : '—'}</Td>
                              <Td>{signed}</Td>
                              <Td className="max-w-[280px] truncate" title={r.notes ?? ''}>{r.notes ?? '—'}</Td>
                              <Td>
                                <div className="flex gap-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => router.push(`/health/${clienteId}/reconciliation?mes=${r.mes}`)}
                                  >
                                    Ver
                                  </Button>
                                  {r.status === 'CLOSED' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reopenMutation.mutate(r.mes)}
                                      disabled={reopenMutation.isPending}
                                    >
                                      Reabrir
                                    </Button>
                                  )}
                                </div>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* paginação */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                      Anterior
                    </Button>
                    <Button onClick={() => setPage((p) => p + 1)} disabled={!data.pagination.hasMore}>
                      Próxima
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </CardContent></Card>
  );
}
function Th(
  { className = '', children, ...props }: React.ComponentProps<'th'>
) {
  return (
    <th
      className={`px-3 py-2 text-xs font-medium text-muted-foreground ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}
function Td(
  { className = '', children, ...props }: React.ComponentProps<'td'>
) {
  return (
    <td
      className={`px-3 py-2 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
