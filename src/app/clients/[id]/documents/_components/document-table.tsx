'use client';

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatBytes, formatDate } from '@/lib/format';
import type { DocumentCategory, DocumentFromApi, DocumentListResponse } from '@/types/document';

const CATEGORIES: (DocumentCategory | 'ALL')[] = [
  'ALL','APOLICE','PROPOSTA','CONTRATO','FATURA','ANEXO','ADITIVO','BOLETIMDEOCORRENCIA','AVISODESINISTRO',
  'LAUDODEPERICIA','COMUNICADODEACIDENTE','COMPROVANTEDERESIDENCIA','RELATORIODEREGULACAO','DOCUMENTO','OUTRO',
];

type Props = {
  clientId: string;
  refreshKey?: number;
};

export default function DocumentTable({ clientId, refreshKey }: Props) {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<(DocumentCategory | 'ALL')>('ALL');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [data, setData] = useState<DocumentListResponse | null>(null);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category && category !== 'ALL') params.set('category', category);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return params.toString();
  }, [q, category, page, limit]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch<DocumentListResponse>(`/clients/${encodeURIComponent(clientId)}/documents?${qs}`)
      .then((res) => mounted && setData(res))
      .catch((e) => toast.error(errorMessage(e) || 'Erro ao listar documentos.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, qs, refreshKey]);

  async function handleDownload(doc: DocumentFromApi) {
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(doc.id)}/download`, {
        credentials: 'include',
        headers: { Authorization: '' }, // api gateway já adiciona, se precisar
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha no download.');
    }
  }

  async function handleDelete(doc: DocumentFromApi) {
    const ok = window.confirm(`Excluir "${doc.filename}"?`);
    if (!ok) return;
    try {
      await apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/documents/${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
      });
      toast.success('Documento excluído.');
      // reload page results
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((d) => d.id !== doc.id),
          total: Math.max(0, prev.total - 1),
          pageCount: Math.ceil(Math.max(0, prev.total - 1) / limit),
        };
      });
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha ao excluir.');
    }
  }

  const items = data?.items ?? [];

  return (
    <Card className="border-none shadow-none">
      <CardContent className="px-0">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome, tag, nota..."
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
              className="w-64"
            />
            <Select value={category} onValueChange={(v) => { setPage(1); setCategory(v as any); }}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c === 'ALL' ? 'Todas' : c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${data?.total ?? 0} resultado(s)`}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum documento.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-3">Arquivo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Tamanho</th>
                  <th className="p-3">Criado em</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((doc) => (
                  <tr key={doc.id} className="border-t">
                    <td className="p-3">{doc.filename}</td>
                    <td className="p-3">{doc.category}</td>
                    <td className="p-3">{formatBytes(doc.size)}</td>
                    <td className="p-3">{formatDate(doc.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => handleDownload(doc)}>Baixar</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(doc)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* paginação simples */}
        {data && data.pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <div>Página {data.page} de {data.pageCount}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={page >= data.pageCount} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
