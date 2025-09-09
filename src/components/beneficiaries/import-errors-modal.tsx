'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

type UploadSummary = {
  totalLinhas: number; processados: number; criados: number; atualizados: number; rejeitados: number;
  porMotivo?: { motivo: string; count: number }[];
  porTipo?: { titulares: { criados: number; atualizados: number }; dependentes: { criados: number; atualizados: number } };
};

type Diff = { scope: 'core' | 'operadora'; field: string; before: any; after: any };
type UpdatedByCpfItem = {
  cpf?: string | null;
  nome?: string | null;
  beneficiarioId?: string;
  ocorrencias: number;
  changesCount: number;
  criticalChangesCount: number;
  fields: Array<{ field: string; scope: 'core' | 'operadora' }>;
  diffs: Diff[];
  fileLines: number[];
  matchBy: 'CPF' | 'Nome+Dt.Nasc';
};

type ImportReport = {
  ok: boolean;
  summary: UploadSummary;
  updated: { byCpf: UpdatedByCpfItem[]; aggregates: { byField: { field: string; count: number; scope: 'core' | 'operadora' }[]; byMatch: { rule: 'CPF' | 'Nome+Dt.Nasc'; count: number }[]; criticalOnly: { field: string; count: number }[] } };
  duplicates: { byCpf: Array<{ cpf: string; ocorrencias: number; fileLines: number[] }> };
  errors: Array<{ row: number; motivo: string; dados?: any }>;
};

function Pill({label, scope}:{label:string; scope:'core'|'operadora'}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs
      ${scope === 'core' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'}`}>
      {label}
    </span>
  );
}

function Stat({title, value}:{title:string; value:React.ReactNode}) {
  return (
    <Card><CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">{title}</CardTitle></CardHeader>
    <CardContent className="pt-0"><div className="text-2xl font-semibold">{value}</div></CardContent></Card>
  );
}

export function ImportErrorsModal({
  open, onOpenChange, clientId, initialErrors, summary,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  initialErrors: any[];
  summary: UploadSummary | null;
}) {
  const [report, setReport] = React.useState<ImportReport | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<ImportReport>(`/clients/${clientId}/beneficiaries/import-report/last`)
      .then((r) => { setReport(r); setErr(null); })
      .catch((e) => setErr(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [open, clientId]);

  const effective = report ?? {
    ok: true,
    summary: summary ?? { totalLinhas: 0, processados: 0, criados: 0, atualizados: 0, rejeitados: 0 },
    updated: { byCpf: [], aggregates: { byField: [], byMatch: [], criticalOnly: [] } },
    duplicates: { byCpf: [] },
    errors: initialErrors ?? [],
  };

  // ---------------- UI: Atualizados (por CPF) ----------------
  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState<'all'|'core'|'operadora'>('all');
  const [criticalOnly, setCriticalOnly] = React.useState(false);

  const CRITICAL = new Set([
    'nomeCompleto','tipo','status','dataEntrada','dataNascimento','valorMensalidade',
    'plano','matricula','carteirinha','titularId'
  ]);

  const updatedFiltered = React.useMemo(() => {
    return effective.updated.byCpf.filter(r => {
      const q = query.trim().toLowerCase();
      const hitsQuery = !q || (r.cpf ?? '').includes(q) || (r.nome ?? '').toLowerCase().includes(q);
      const hitsScope = scope === 'all' || r.diffs.some(d => d.scope === scope);
      const hitsCritical = !criticalOnly || r.diffs.some(d => CRITICAL.has(d.field));
      return hitsQuery && hitsScope && hitsCritical;
    });
  }, [effective.updated.byCpf, query, scope, criticalOnly]);

  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>Erros & Evidências de Importação</DialogTitle>
          <DialogDescription>Visualize o que foi criado/atualizado, duplicidades no arquivo e erros rejeitados.</DialogDescription>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Stat title="Total linhas" value={effective.summary.totalLinhas} />
          <Stat title="Processados" value={effective.summary.processados} />
          <Stat title="Criados" value={effective.summary.criados} />
          <Stat title="Atualizados" value={effective.summary.atualizados} />
          <Stat title="Rejeitados" value={effective.summary.rejeitados} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : err ? (
          <div className="text-sm text-destructive">{err}</div>
        ) : (
          <Tabs defaultValue="updated">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="updated">Atualizados ({effective.summary.atualizados})</TabsTrigger>
              <TabsTrigger value="dups">Duplicidades ({effective.duplicates.byCpf.length})</TabsTrigger>
              <TabsTrigger value="errors">Erros ({effective.summary.rejeitados})</TabsTrigger>
            </TabsList>

            {/* Atualizados */}
            <TabsContent value="updated">
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">Top campos alterados</CardTitle></CardHeader>
                  <CardContent className="pt-1 flex flex-wrap gap-2">
                    {effective.updated.aggregates.byField.slice(0, 10).map((f, i) => (
                      <Pill key={i} scope={f.scope} label={`${f.field} (${f.count})`} />
                    ))}
                    {!effective.updated.aggregates.byField.length && <span className="text-xs text-muted-foreground">—</span>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">Por regra de match</CardTitle></CardHeader>
                  <CardContent className="pt-1 text-sm text-muted-foreground">
                    {effective.updated.aggregates.byMatch.map((m, i) => (
                      <div key={i}>{m.rule}: <span className="font-medium text-foreground">{m.count}</span></div>
                    ))}
                    {!effective.updated.aggregates.byMatch.length && <div>—</div>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-xs text-muted-foreground">Críticos</CardTitle></CardHeader>
                  <CardContent className="pt-1 flex flex-wrap gap-2">
                    {effective.updated.aggregates.criticalOnly.slice(0, 8).map((c, i) => (
                      <span key={i} className="text-xs rounded-md bg-amber-50 text-amber-700 px-2 py-0.5">{c.field} ({c.count})</span>
                    ))}
                    {!effective.updated.aggregates.criticalOnly.length && <span className="text-xs text-muted-foreground">—</span>}
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-2 items-center mb-2">
                <Input placeholder="Buscar CPF ou Nome…" value={query} onChange={(e)=>setQuery(e.target.value)} className="w-[260px]" />
                <Select value={scope} onValueChange={(v)=>setScope(v as any)}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Escopo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os campos</SelectItem>
                    <SelectItem value="core">Somente core</SelectItem>
                    <SelectItem value="operadora">Somente operadora</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Checkbox id="crit" checked={criticalOnly} onCheckedChange={(v)=>setCriticalOnly(Boolean(v))} />
                  <label htmlFor="crit" className="text-sm text-muted-foreground">Somente críticos</label>
                </div>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(JSON.stringify(updatedFiltered, null, 2))}
                  >
                    Copiar JSON
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Ocorrências</TableHead>
                      <TableHead>Alterações</TableHead>
                      <TableHead>Campos</TableHead>
                      <TableHead>Linhas do arquivo</TableHead>
                      <TableHead>Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updatedFiltered.map((r, idx) => {
                      const id = r.beneficiarioId ?? `${r.cpf}-${idx}`;
                      const isOpen = !!openRows[id];
                      const chips = r.fields.slice(0, 5);
                      return (
                        <React.Fragment key={id}>
                          <TableRow className="cursor-pointer" onClick={() => setOpenRows(s => ({...s, [id]: !isOpen}))}>
                            <TableCell>{r.cpf ?? '—'}</TableCell>
                            <TableCell className="font-medium">{r.nome ?? '—'}</TableCell>
                            <TableCell>{r.ocorrencias}</TableCell>
                            <TableCell>{r.changesCount}{r.criticalChangesCount>0 && <span className="ml-2 text-xs text-amber-600">({r.criticalChangesCount} críticos)</span>}</TableCell>
                            <TableCell className="space-x-1 whitespace-nowrap">
                              {chips.map((f, i)=> <Pill key={i} label={f.field} scope={f.scope} />)}
                              {r.fields.length>chips.length && <span className="text-xs text-muted-foreground">+{r.fields.length - chips.length}</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{r.fileLines.join(', ')}</TableCell>
                            <TableCell>{r.matchBy}</TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow className="bg-muted/40">
                              <TableCell colSpan={7}>
                                <div className="grid md:grid-cols-2 gap-3">
                                  {r.diffs.map((d, i)=>(
                                    <div key={i} className="rounded-md border p-2 text-sm bg-background">
                                      <div className="mb-1"><Pill label={d.field} scope={d.scope} /></div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="truncate text-muted-foreground"><span className="font-medium">De:</span> {String(d.before ?? '—')}</div>
                                        <div className="truncate"><span className="font-medium">Para:</span> {String(d.after ?? '—')}</div>
                                      </div>
                                    </div>
                                  ))}
                                  {!r.diffs.length && <div className="text-sm text-muted-foreground">Sem diffs.</div>}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                    {!updatedFiltered.length && (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sem atualizações a exibir.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Duplicidades */}
            <TabsContent value="dups">
              <div className="text-xs text-muted-foreground mb-2">
                CPF repetido no arquivo indica linhas que podem ter sido **mescladas** em um único update.
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CPF</TableHead>
                      <TableHead>Ocorrências</TableHead>
                      <TableHead>Linhas do arquivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effective.duplicates.byCpf.map((d, i)=>(
                      <TableRow key={i}>
                        <TableCell>{d.cpf}</TableCell>
                        <TableCell>{d.ocorrencias}</TableCell>
                        <TableCell className="text-muted-foreground">{d.fileLines.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                    {!effective.duplicates.byCpf.length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem duplicidades no arquivo.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2">
                <Button variant="outline" onClick={()=>navigator.clipboard.writeText(JSON.stringify(effective.duplicates.byCpf, null, 2))}>Copiar JSON</Button>
              </div>
            </TabsContent>

            {/* Erros */}
            <TabsContent value="errors">
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead># Linha</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Dados (JSON)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effective.errors.map((e, i)=>(
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell className="text-red-600">{e.motivo}</TableCell>
                        <TableCell>
                          <pre className="text-xs whitespace-pre-wrap max-h-[160px] overflow-auto bg-muted/40 p-2 rounded">{JSON.stringify(e.dados ?? {}, null, 2)}</pre>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!effective.errors.length && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sem erros para exibir.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" onClick={()=>navigator.clipboard.writeText(JSON.stringify(effective.errors, null, 2))}>Copiar JSON</Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
