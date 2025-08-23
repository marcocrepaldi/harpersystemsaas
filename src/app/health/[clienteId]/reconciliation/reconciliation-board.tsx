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

function ReconTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<(string | number)[]>;
}) {
  return (
    <div className="rounded-md border">
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
            rows.map((r, i) => (
              <TableRow key={i}>
                {r.map((cell, j) => (
                  <TableCell
                    key={`${i}-${j}`}
                    className={j >= columns.length - 2 ? 'text-right' : ''}
                  >
                    {String(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))
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

  const { data, isLoading, isError, refetch } = useQuery<ReconResp>({
    queryKey: ['recon.v1', clienteId, mes || 'current'],
    queryFn: () =>
      apiFetch<ReconResp>(
        `/clients/${clienteId}/reconciliation${mes ? `?mes=${mes}` : ''}`,
      ),
  });

  return (
    <div className="bg-muted/50 rounded-xl p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Conciliação da Fatura</CardTitle>
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
            <Tabs defaultValue="mismatched" className="w-full">
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
                />
              </TabsContent>

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
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ReconciliationBoard;
