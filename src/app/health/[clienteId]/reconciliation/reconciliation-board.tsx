'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

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
  tabs: {
    onlyInInvoice: Array<{ cpf: string; nome: string; valorCobrado: string }>;
    onlyInRegistry: Array<{ cpf: string; nome: string; valorMensalidade: string }>;
    mismatched: Array<{ cpf: string; nome: string; valorCobrado: string; valorMensalidade: string; diferenca: string }>;
    duplicates: Array<{ cpf: string; nome: string; ocorrencias: number; somaCobrada: string; valores: string[] }>;
  };
};

type RowVariant = 'ok' | 'error' | undefined;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function ReconTable({
  columns,
  rows,
  getRowVariant,
  emphasizeCols = [],
}: {
  columns: string[];
  rows: Array<(string | number)[]>;
  /** Define a cor da linha: 'ok' = verde, 'error' = vermelho */
  getRowVariant?: (row: (string | number)[], index: number) => RowVariant;
  /** Índices (0-based) de colunas com ênfase (ex.: Diferença/Soma) */
  emphasizeCols?: number[];
}) {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c}>{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center text-sm text-muted-foreground"
              >
                Nenhum registro para exibir.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => {
              const variant = getRowVariant?.(r, i);
              const rowClass =
                variant === 'error'
                  ? 'bg-red-50/70 hover:bg-red-50'
                  : variant === 'ok'
                  ? 'bg-emerald-50/70 hover:bg-emerald-50'
                  : undefined;

              return (
                <TableRow key={i} className={rowClass}>
                  {r.map((cell, j) => {
                    const emphasize =
                      emphasizeCols.includes(j) &&
                      (variant === 'error' || variant === 'ok');
                    const emphasizeClass =
                      variant === 'error'
                        ? 'font-semibold text-red-700'
                        : variant === 'ok'
                        ? 'font-semibold text-emerald-700'
                        : undefined;

                    return (
                      <TableCell
                        key={`${i}-${j}`}
                        className={cx(
                          j >= columns.length - 2 ? 'text-right' : '',
                          emphasize ? emphasizeClass : '',
                        )}
                      >
                        {String(cell)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ReconciliationBoard() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const sp = useSearchParams();
  const mesParam = sp.get('mes') || '';
  const [mes, setMes] = React.useState(mesParam);
  const [activeTab, setActiveTab] =
    React.useState<'mismatched'|'onlyInInvoice'|'onlyInRegistry'|'duplicates'>('mismatched');
  const [format, setFormat] = React.useState<'xlsx'|'csv'>('xlsx');

  const { data, isLoading, isError, refetch } = useQuery<ReconResp>({
    queryKey: ['recon.v1', clienteId, mes || 'current'],
    queryFn: () =>
      apiFetch<ReconResp>(
        `/clients/${clienteId}/reconciliation${mes ? `?mes=${mes}` : ''}`,
      ),
  });

  // link para exportação da aba atual
  const buildExportUrl = (tab: string) => {
    const params = new URLSearchParams();
    if (mes) params.set('mes', mes);
    params.set('format', format);
    params.set('tab', tab);
    return `/clients/${clienteId}/reconciliation/export?${params.toString()}`;
  };

  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
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

            {/* Legenda com Tooltip */}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    aria-label="Legenda de cores"
                  >
                    Legenda
                    <span className="inline-flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Conforme (valores batem)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Divergente / Duplicado</span>
                  </div>
                  <div className="pt-1 text-xs text-muted-foreground">
                    * Nas abas atuais mostramos divergências, duplicados e ausências.
                    Linhas “conformes” aparecerão em verde quando houver uma aba de conciliados.
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-[180px]"
            />
            <Button onClick={() => refetch()}>Buscar</Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : isError || !data ? (
            <div className="text-sm text-destructive">
              Falha ao carregar a conciliação.
            </div>
          ) : (
            <>
              {/* Controles de exportação */}
              <div className="mb-3 flex items-center gap-2">
                <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>

                <a href={buildExportUrl(activeTab)} rel="noopener" className="inline-block">
                  <Button>Exportar aba atual</Button>
                </a>

                <a
                  href={buildExportUrl('all')}
                  rel="noopener"
                  className="inline-block"
                  onClick={(e) => {
                    if (format === 'csv') {
                      e.preventDefault();
                      alert('CSV não suporta exportar "Todas". Selecione XLSX ou escolha uma aba específica.');
                    }
                  }}
                >
                  <Button variant="secondary">Exportar todas (XLSX)</Button>
                </a>
              </div>

              <Tabs
                defaultValue="mismatched"
                onValueChange={(v) =>
                  setActiveTab(v as 'mismatched'|'onlyInInvoice'|'onlyInRegistry'|'duplicates')
                }
                className="w-full"
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="mismatched">
                    Divergentes ({data.totals.mismatched})
                  </TabsTrigger>
                  <TabsTrigger value="onlyInInvoice">
                    Só na fatura ({data.totals.onlyInInvoice})
                  </TabsTrigger>
                  <TabsTrigger value="onlyInRegistry">
                    Só no cadastro ({data.totals.onlyInRegistry})
                  </TabsTrigger>
                  <TabsTrigger value="duplicates">
                    Duplicados ({data.totals.duplicates})
                  </TabsTrigger>
                </TabsList>

                {/* Divergentes -> linhas vermelhas, ênfase na Diferença (coluna 4) */}
                <TabsContent value="mismatched">
                  <ReconTable
                    columns={[
                      'Beneficiário',
                      'CPF',
                      'Cobrado',
                      'Mensalidade',
                      'Diferença',
                    ]}
                    rows={data.tabs.mismatched.map((r) => [
                      r.nome,
                      r.cpf,
                      r.valorCobrado,
                      r.valorMensalidade,
                      r.diferenca,
                    ])}
                    getRowVariant={() => 'error'}
                    emphasizeCols={[4]}
                  />
                </TabsContent>

                {/* Só na fatura -> padrão */}
                <TabsContent value="onlyInInvoice">
                  <ReconTable
                    columns={['Beneficiário', 'CPF', 'Valor Cobrado']}
                    rows={data.tabs.onlyInInvoice.map((r) => [
                      r.nome,
                      r.cpf,
                      r.valorCobrado,
                    ])}
                  />
                </TabsContent>

                {/* Só no cadastro -> padrão */}
                <TabsContent value="onlyInRegistry">
                  <ReconTable
                    columns={['Beneficiário', 'CPF', 'Mensalidade']}
                    rows={data.tabs.onlyInRegistry.map((r) => [
                      r.nome,
                      r.cpf,
                      r.valorMensalidade,
                    ])}
                  />
                </TabsContent>

                {/* Duplicados -> linhas vermelhas, ênfase na Soma cobrada (coluna 4) */}
                <TabsContent value="duplicates">
                  <ReconTable
                    columns={[
                      'Beneficiário',
                      'CPF',
                      'Ocorrências',
                      'Soma cobrada',
                      'Valores',
                    ]}
                    rows={data.tabs.duplicates.map((r) => [
                      r.nome,
                      r.cpf,
                      String(r.ocorrencias),
                      r.somaCobrada,
                      r.valores.join(', '),
                    ])}
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

export default ReconciliationBoard;
