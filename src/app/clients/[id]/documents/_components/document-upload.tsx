'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { fileToBase64 } from '@/lib/files';
import { parseTags } from '@/lib/format';
import type { DocumentCategory, DocumentFromApi } from '@/types/document';

const CATEGORIES: DocumentCategory[] = [
  'APOLICE','PROPOSTA','CONTRATO','FATURA','ANEXO','ADITIVO','BOLETIMDEOCORRENCIA','AVISODESINISTRO',
  'LAUDODEPERICIA','COMUNICADODEACIDENTE','COMPROVANTEDERESIDENCIA','RELATORIODEREGULACAO','DOCUMENTO','OUTRO',
];

type Props = {
  clientId: string;
  onUploaded?: (doc: DocumentFromApi) => void;
};

export default function DocumentUpload({ clientId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('ANEXO');
  const [tags, setTags] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  function normalizeDataUrl(b64: string, mime: string) {
    // backend aceita com ou sem prefixo; manter formato consistente ajuda a depurar
    if (b64.includes(',')) return b64; // já é data URL
    const safeMime = mime || 'application/octet-stream';
    return `data:${safeMime};base64,${b64}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // evita duplo clique
    if (!file) {
      toast.error('Selecione um arquivo.');
      return;
    }
    if (file.size === 0) {
      toast.error('Arquivo vazio.');
      return;
    }

    setSubmitting(true);
    try {
      const raw = await fileToBase64(file); // pode vir dataURL ou só base64
      const dataUrl = normalizeDataUrl(raw, file.type);

      const body = {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: dataUrl,
        category,
        tags: parseTags(tags),
        notes: notes || undefined,
      };

      const doc = await apiFetch<DocumentFromApi>(
        `/clients/${encodeURIComponent(clientId)}/documents/upload-base64`,
        { method: 'POST', body }
      );

      toast.success('Documento enviado.');
      setFile(null);
      setTags('');
      setNotes('');
      setCategory('ANEXO');
      onUploaded?.(doc);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha no upload.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-none shadow-none">
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                accept="*/*"
                disabled={submitting}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as DocumentCategory)}
                disabled={submitting}
              >
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="ex: apólice, 2025, cliente-x"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações..."
                rows={1}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="pt-1">
            <Button type="submit" disabled={submitting || !file}>
              {submitting ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
