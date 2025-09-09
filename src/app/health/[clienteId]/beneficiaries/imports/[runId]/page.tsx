// app/health/[clienteId]/beneficiaries/imports/[runId]/page.tsx
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/* ===================== Tipos ===================== */

type Diff = { scope: 'core' | 'operadora'; field: string; before: any; after: any };

type UpdatedDetail = {
  row: number;
  id: string;
  cpf?: string | null;
  nome?: string | null;
  tipo?: string | null;
  matchBy: 'CPF' | 'NOME_DTNASC';
  changed: Diff[];
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

export type UploadResult = {
  ok: boolean;
  runId: string;
  summary: UploadSummary;
  errors: Array<{ row: number; motivo: string; dados?: any }>;
  updatedDetails: UpdatedDetail[];
  duplicatesInFile: { cpf: string; rows: number[] }[];
};

/* ===================== Helpers ===================== */

/** Normaliza a resposta da API: aceita UploadResult, {result}, {data}… */
/** Normaliza a resposta da API: aceita UploadResult, {result}, {data}, ou ImportRun com payload */
function normalizeRunPayload(x: any): UploadResult | null {
  if (!x) return null;

  // 🔹 SE vier ImportRun do banco, usa o payload interno
  const container = x?.payload ? x.payload : (x?.result ?? x?.data ?? x);
  if (!container || typeof container !== 'object') return null;

  // 🔹 Preenche defaults para evitar undefined
  container.summary = container.summary ?? {
    totalLinhas: 0,
    processados: 0,
    criados: 0,
    atualizados: 0,
    rejeitados: 0,
    atualizadosPorCpf: 0,
    atualizadosPorNomeData: 0,
    duplicadosNoArquivo: [],
  };
  container.updatedDetails = Array.isArray(container.updatedDetails) ? container.updatedDetails : [];
  container.errors = Array.isArray(container.errors) ? container.errors : [];
  container.duplicatesInFile = Array.isArray(container.duplicatesInFile) ? container.duplicatesInFile : [];

  // 🔹 Se o runId não estiver no payload, pega do ImportRun externo
  container.runId = container.runId ?? x?.runId ?? x?.id ?? 'sem-id';

  return container as UploadResult;
}

/* ===================== Página ===================== */

export default function Page() {
  const { clienteId, runId } = useParams<{ clienteId: string; runId: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['beneficiaries-import-run', clienteId, runId],
    queryFn: async ({ signal }) => {
      const path =
        runId === 'latest'
          ? `/clients/${clienteId}/beneficiaries/imports/latest`
          : `/clients/${clienteId}/beneficiaries/imports/run/${runId}`;

      try {
        const raw = await apiFetch<any>(path, { signal });
        return normalizeRunPayload(raw);
      } catch (e: any) {
        // 404 → tratamos como não encontrado
        if (e?.status === 404) return null;
        throw e;
      }
    },
    staleTime: 0,
  });

  /* ======= Estados de carregamento/erro ======= */
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-7 w-72" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-destructive">Erro ao carregar a importação.</p>
        <p className="text-xs text-muted-foreground break-all">
          {String((error as any)?.message ?? error ?? 'Erro desconhecido')}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
          <Button onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm">Nenhuma importação encontrada.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
          <Button onClick={() => router.push(`/health/${clienteId}/beneficiaries`)}>Ir para Beneficiários</Button>
        </div>
      </div>
    );
  }

  /* ======= Dados seguros ======= */
  const s = data.summary ?? {
    totalLinhas: 0,
    processados: 0,
    criados: 0,
    atualizados: 0,
    rejeitados: 0,
    atualizadosPorCpf: 0,
    atualizadosPorNomeData: 0,
    duplicadosNoArquivo: [],
  };

  const updatedDetails = Array.isArray(data.updatedDetails) ? data.updatedDetails : [];
  const duplicatesInFile = Array.isArray(data.duplicatesInFile) ? data.duplicatesInFile : [];
  const errors = Array.isArray(data.errors) ? data.errors : [];

  const totalChangedFields = updatedDetails.reduce((acc, d) => acc + (d.changed?.length ?? 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Importação #{data.runId}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/health/${clienteId}/beneficiaries`)}
          >
            Voltar à lista
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Total linhas</div>
            <div className="text-xl font-semibold">{s.totalLinhas ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Processados</div>
            <div className="text-xl font-semibold">{s.processados ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Criados</div>
            <div className="text-xl font-semibold text-emerald-600">{s.criados ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Atualizados</div>
            <div className="text-xl font-semibold text-blue-600">{s.atualizados ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Rejeitados</div>
            <div className="text-xl font-semibold text-red-600">{s.rejeitados ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Atualizados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Atualizados ({s.atualizados ?? 0})
            {totalChangedFields ? (
              <span className="text-sm text-muted-foreground font-normal"> • {totalChangedFields} alterações</span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="border-t pt-0">
          <div className="overflow-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Linha</TableHead>
                  <TableHead>Beneficiário</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Alterações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {updatedDetails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum registro atualizado.
                    </TableCell>
                  </TableRow>
                ) : (
                  updatedDetails.map((u) => (
                    <TableRow key={`${u.id}-${u.row}`}>
                      <TableCell>{u.row}</TableCell>
                      <TableCell className="font-medium">{u.nome ?? '—'}</TableCell>
                      <TableCell>{u.cpf ?? '—'}</TableCell>
                      <TableCell>{u.matchBy === 'CPF' ? 'CPF' : 'Nome + Data Nasc.'}</TableCell>
                      <TableCell>
                        {(u.changed ?? []).length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1">
                            {u.changed.map((c, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="px-1 py-0.5 rounded bg-muted mr-2">{c.scope}</span>
                                <b>{c.field}</b>:{' '}
                                <span className="line-through text-muted-foreground">
                                  {String(c.before ?? '—')}
                                </span>{' '}
                                → <span>{String(c.after ?? '—')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Duplicidades */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicidades no arquivo ({s.duplicadosNoArquivo?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="border-t pt-0">
          <div className="overflow-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CPF</TableHead>
                  <TableHead>Ocorrências</TableHead>
                  <TableHead>Linhas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duplicatesInFile.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhuma duplicidade encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  duplicatesInFile.map((d) => (
                    <TableRow key={d.cpf + d.rows.join('-')}>
                      <TableCell>{d.cpf}</TableCell>
                      <TableCell>{d.rows.length}</TableCell>
                      <TableCell>{d.rows.join(', ')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Erros */}
      <Card>
        <CardHeader>
          <CardTitle>Erros ({errors.length})</CardTitle>
        </CardHeader>
        <CardContent className="border-t pt-0">
          <div className="overflow-auto rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Linha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Dados (resumo)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Sem erros.
                    </TableCell>
                  </TableRow>
                ) : (
                  errors.map((e, i) => (
                    <TableRow key={`${e.row}-${i}`}>
                      <TableCell>{e.row}</TableCell>
                      <TableCell className="text-red-600">{e.motivo}</TableCell>
                      <TableCell
                        className="max-w-[520px] truncate"
                        title={JSON.stringify(e.dados ?? {})}
                      >
                        {e.dados
                          ? JSON.stringify(e.dados).slice(0, 120) +
                            (JSON.stringify(e.dados).length > 120 ? '…' : '')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
