'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog as Dialog,
  AlertDialogContent as DialogContent,
  AlertDialogDescription as DialogDescription,
  AlertDialogHeader as DialogHeader,
  AlertDialogTitle as DialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Download, RefreshCw, Trash2, Copy, Search } from 'lucide-react';
import { useImportErrors } from './useImportErrors';

export type LocalError = {
  line?: number;
  message?: string;
  data?: any;
  createdAt?: string;
};

// erros vindos do servidor no retorno do upload
export type ServerError = {
  linha: number;
  motivo: string;
  dados: any;
  createdAt?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  /** Erros retornados imediatamente pelo upload */
  initialErrors?: Array<LocalError | ServerError>;
};

type Tab = 'latest' | 'history';

function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR');
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function jsonToCsv(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v == null) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    const needs = /[",\n;]/.test(s);
    return needs ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map(esc).join(';');
  const body = rows.map(r => headers.map(h => esc(r[h])).join(';')).join('\n');
  return `${head}\n${body}`;
}

export function ImportErrorsModal({ open, onOpenChange, clientId, initialErrors = [] }: Props) {
  const [tab, setTab] = useState<Tab>('latest');
  const [queryText, setQueryText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Busca histórico no servidor
  const {
    isLoading,
    latest,
    history,
    refetch,
    clearAll,
    exportCsvPayload,
  } = useImportErrors({ clientId, query: queryText, tab });

  // === NORMALIZA ambos formatos (local/cliente e servidor) ===
  const mappedInitial = useMemo(() => {
    return (initialErrors || []).map((e, idx) => {
      const any = e as any;
      const linha = 'linha' in any ? any.linha : ('line' in any ? any.line : null);
      const motivo = 'motivo' in any ? any.motivo : (any.message ?? 'Erro de validação');
      const dados  = 'dados'  in any ? any.dados  : (any.data ?? {});
      const createdAt = any.createdAt ?? new Date().toISOString();
      return {
        id: `local-${idx}`,
        clientId,
        linha: typeof linha === 'number' ? linha : (linha == null ? null : Number(linha) || null),
        motivo: motivo || 'Erro de validação',
        dados,
        createdAt,
      };
    });
  }, [initialErrors, clientId]);

  // Lista ativa
  const list = useMemo(() => {
    if (tab === 'latest') {
      if (mappedInitial.length > 0) return mappedInitial;
      return latest ?? [];
    }
    return history ?? [];
  }, [tab, mappedInitial, latest, history]);

  // Seleção segura ao abrir/mudar lista
  useEffect(() => {
    if (!open) return;
    if (list.length > 0) {
      const found = selectedId ? list.find(x => x.id === selectedId) : undefined;
      setSelectedId(found ? found.id : list[0].id);
    } else {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, list]);

  const selected = useMemo(
    () => (selectedId ? list.find((x) => x.id === selectedId) ?? null : null),
    [list, selectedId]
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success('Atualizado.');
  };

  const handleClear = async () => {
    try {
      await clearAll();
      setSelectedId(null);
      toast.success('Histórico limpo.');
    } catch (e: any) {
      toast.error('Falha ao limpar histórico', { description: e?.message ?? String(e) });
    }
  };

  const handleExport = () => {
    if (tab === 'latest' && mappedInitial.length > 0) {
      const rows = mappedInitial.map(r => ({
        id: r.id,
        clientId: r.clientId,
        linha: r.linha ?? '',
        motivo: r.motivo,
        dados: JSON.stringify(r.dados),
        createdAt: r.createdAt,
      }));
      if (!rows.length) return toast.info('Nada para exportar.');
      const csv = jsonToCsv(rows);
      return downloadBlob(
        `import-errors-latest-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`,
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      );
    }

    const rows = exportCsvPayload(tab);
    if (!rows.length) {
      toast.info('Nada para exportar.');
      return;
    }
    const csv = jsonToCsv(rows);
    downloadBlob(
      `import-errors-${tab}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`,
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
  };

  const copyJson = async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selected.dados, null, 2));
      toast.success('Copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-5xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Erros de importação</DialogTitle>
          <DialogDescription>
            Visualize e exporte as linhas que falharam durante a importação de beneficiários.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="ml-auto flex items-center gap-2 px-6 pb-4">
          <div className="flex gap-1 mr-auto">
            <Button
              variant={tab === 'latest' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('latest')}
            >
              Último upload
            </Button>
            <Button
              variant={tab === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTab('history')}
            >
              Histórico (servidor)
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-[240px]"
              placeholder="Filtrar por texto..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
          <Button variant="destructive" size="sm" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" /> Limpar histórico
          </Button>
        </div>

        {/* Corpo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t">
          {/* Lista */}
          <div className="max-h-[70vh]">
            <ScrollArea className="h-[70vh]">
              {isLoading && list.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
              ) : list.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Sem erros para exibir.</div>
              ) : (
                <ul className="divide-y">
                  {list.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(row.id)}
                          className={`w-full text-left p-4 focus:outline-none ${
                            active ? 'bg-accent/40' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="text-xs text-muted-foreground">
                            Linha {row.linha ?? '—'}
                          </div>
                          <div className="mt-1 text-sm font-medium">{row.motivo}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {fmtDate(row.createdAt)}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>

          {/* Detalhe */}
          <div className="border-l max-h-[70vh]">
            <div className="flex items-center justify-between p-4">
              <div className="text-sm font-medium">Dados (JSON)</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copyJson} disabled={!selected}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!selected) return;
                    const blob = new Blob(
                      [JSON.stringify(selected.dados, null, 2)],
                      { type: 'application/json' }
                    );
                    downloadBlob(`erro-linha-${selected.linha ?? 'na'}.json`, blob);
                  }}
                  disabled={!selected}
                >
                  <Download className="mr-2 h-4 w-4" /> Baixar JSON
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[60vh]">
              <pre className="px-4 pb-6 text-xs leading-relaxed whitespace-pre-wrap">
                {selected ? JSON.stringify(selected.dados, null, 2) : '—'}
              </pre>
            </ScrollArea>
          </div>
        </div>

        <div className="px-6 pb-6 text-[11px] text-muted-foreground">
          Dica: filtre por “CPF”, “matrícula”, “contrato” ou qualquer trecho do JSON.
        </div>
      </DialogContent>
    </Dialog>
  );
}
