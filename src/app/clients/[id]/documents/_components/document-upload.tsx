'use client';

import * as React from 'react';
import { useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { fileToBase64 } from '@/lib/files';
import { parseTags, formatBytes } from '@/lib/format';
import type { DocumentCategory, DocumentFromApi } from '@/types/document';
import { X } from 'lucide-react';

const CATEGORIES: DocumentCategory[] = [
  'APOLICE','PROPOSTA','CONTRATO','FATURA','ANEXO','ADITIVO','BOLETIMDEOCORRENCIA',
  'AVISODESINISTRO','LAUDODEPERICIA','COMUNICADODEACIDENTE','COMPROVANTEDERESIDENCIA',
  'RELATORIODEREGULACAO','DOCUMENTO','OUTRO',
];

const MAX_BYTES = 50 * 1024 * 1024; // 50MB

type Props = {
  clientId: string;
  onUploaded?: (doc: DocumentFromApi) => void;
};

type UploadBase64Dto = {
  filename: string;
  mimeType: string;
  base64: string;
  category?: DocumentCategory;
  tags?: string[];
  notes?: string;
  policyId?: string;
};

export default function DocumentUpload({ clientId, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('ANEXO');
  const [tags, setTags] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- helpers ----------
  const normalizeDataUrl = (b64: string, mime: string) => {
    if (b64.includes(',')) return b64;
    const safeMime = mime || 'application/octet-stream';
    return `data:${safeMime};base64,${b64}`;
  };

  const validateFile = (f: File | null) => {
    if (!f) {
      toast.error('Selecione um arquivo.');
      return false;
    }
    if (f.size === 0) {
      toast.error('Arquivo vazio.');
      return false;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`O tamanho máximo permitido é ${formatBytes(MAX_BYTES)}.`);
      return false;
    }
    return true;
  };

  const pickFile = () => inputRef.current?.click();

  const onChooseFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (!validateFile(f)) return;
    setFile(f);
  };

  // ---------- drag & drop ----------
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!submitting) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (submitting) return;
    const f = e.dataTransfer.files?.[0] ?? null;
    onChooseFile(f);
  };

  // Suporte a colar (paste) arquivo/imagem
  const handlePaste = useCallback((e: ClipboardEvent) => {
    if (submitting) return;
    const item = Array.from(e.clipboardData?.files || [])[0];
    if (item) onChooseFile(item);
  }, [submitting]);

  React.useEffect(() => {
    // habilita colar arquivos/imagens
    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  // ---------- envio ----------
  async function sendDocument() {
    if (!validateFile(file)) return;

    setSubmitting(true);
    try {
      const rawBase64 = await fileToBase64(file!);
      const dataUrl = normalizeDataUrl(rawBase64, file!.type);

      const body: UploadBase64Dto = {
        filename: file!.name,
        mimeType: file!.type || 'application/octet-stream',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    await sendDocument();
  }

  return (
    <Card className="border-none shadow-none">
      <CardContent className="px-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Dropzone */}
          <div
            className={[
              'rounded-lg border-2 border-dashed p-4 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              submitting ? 'opacity-70 pointer-events-none' : '',
            ].join(' ')}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && pickFile()}
            aria-label="Área para arrastar e soltar arquivo"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start">
              <div className="md:flex-1">
                <Label className="mb-1 block">Arquivo</Label>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={pickFile} disabled={submitting}>
                    Escolher arquivo
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    ou arraste e solte aqui (máx. {formatBytes(MAX_BYTES)})
                  </span>
                </div>

                <Input
                  ref={inputRef}
                  id="file"
                  type="file"
                  accept="*/*"
                  disabled={submitting}
                  onChange={(e) => onChooseFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                {/* Preview do arquivo escolhido */}
                {file && (
                  <div className="mt-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.name}</div>
                      <div className="text-muted-foreground">{formatBytes(file.size)} · {file.type || 'application/octet-stream'}</div>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setFile(null)}
                      disabled={submitting}
                      aria-label="Remover arquivo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="md:w-56">
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
                rows={2}
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
