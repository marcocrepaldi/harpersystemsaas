'use client';

import * as React from 'react';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/errors';
import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export const InsuranceLineSchema = z.enum(['HEALTH', 'DENTAL', 'LIFE', 'P_AND_C', 'OTHER']);
export type InsuranceLine = z.infer<typeof InsuranceLineSchema>;

const FormSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  legalName: z.string().min(1),
  tradeName: z.string().min(1),
  taxId: z.string().optional().or(z.literal('')),
  ansCode: z.string().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  lines: z.array(InsuranceLineSchema).min(1),
  isActive: z.boolean().default(true),
});

export type InsurerFormData = z.infer<typeof FormSchema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: 'create' | 'edit';
  initial?: Partial<InsurerFormData> & { id?: string; expectedUpdatedAt?: string };
  linesEnum: InsuranceLine[];
};

export default function InsurerFormDialog({ open, onOpenChange, mode, initial, linesEnum }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<InsurerFormData>({
    slug: initial?.slug ?? '',
    legalName: initial?.legalName ?? '',
    tradeName: initial?.tradeName ?? '',
    taxId: initial?.taxId ?? '',
    ansCode: initial?.ansCode ?? '',
    website: initial?.website ?? '',
    lines: initial?.lines ?? (linesEnum?.length ? [linesEnum[0]] : ['HEALTH']),
    isActive: initial?.isActive ?? true,
  });

  React.useEffect(() => {
    if (!open) return;
    setForm({
      slug: initial?.slug ?? '',
      legalName: initial?.legalName ?? '',
      tradeName: initial?.tradeName ?? '',
      taxId: initial?.taxId ?? '',
      ansCode: initial?.ansCode ?? '',
      website: initial?.website ?? '',
      lines: initial?.lines ?? (linesEnum?.length ? [linesEnum[0]] : ['HEALTH']),
      isActive: initial?.isActive ?? true,
    });
  }, [open, initial, linesEnum]);

  const mutation = useMutation({
    mutationFn: async (payload: InsurerFormData) => {
      const parsed = FormSchema.safeParse(payload);
      if (!parsed.success) throw new Error(parsed.error.issues?.[0]?.message ?? 'Dados inválidos');
      if (mode === 'create') {
        return apiFetch('/insurers', {
          method: 'POST',
          body: {
            ...payload,
            taxId: payload.taxId || undefined,
            ansCode: payload.ansCode || undefined,
            website: payload.website || undefined,
          },
        });
      } else {
        return apiFetch(`/insurers/${encodeURIComponent(String(initial?.id))}`, {
          method: 'PATCH',
          body: {
            ...payload,
            taxId: payload.taxId || undefined,
            ansCode: payload.ansCode || undefined,
            website: payload.website || undefined,
            expectedUpdatedAt: initial?.expectedUpdatedAt,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(mode === 'create' ? 'Seguradora criada.' : 'Seguradora atualizada.');
      qc.invalidateQueries({ queryKey: ['insurers'] });
      onOpenChange(false);
    },
    onError: (e) => toast.error('Falha ao salvar seguradora.', { description: errorMessage(e) }),
  });

  const toggleLine = (line: InsuranceLine, checked: boolean) => {
    setForm((f) => {
      const set = new Set(f.lines);
      if (checked) set.add(line);
      else set.delete(line);
      return { ...f, lines: Array.from(set) as InsuranceLine[] };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !mutation.isPending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nova seguradora' : 'Editar seguradora'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="ex.: bradesco-saude"
            />
            <p className="text-xs text-muted-foreground">minúsculas, números e hífens</p>
          </div>

          <div className="space-y-1.5">
            <Label>Trade name *</Label>
            <Input
              value={form.tradeName}
              onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
              placeholder="ex.: Bradesco Saúde"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Legal name *</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder="ex.: BRADESCO SAÚDE S.A."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input
              value={form.website || ''}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tax ID (CNPJ)</Label>
            <Input
              value={form.taxId || ''}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
              placeholder="Somente números"
            />
          </div>

          <div className="space-y-1.5">
            <Label>ANS Code</Label>
            <Input
              value={form.ansCode || ''}
              onChange={(e) => setForm((f) => ({ ...f, ansCode: e.target.value }))}
              placeholder="Registro ANS (se aplicável)"
            />
          </div>

          <div className="col-span-1 md:col-span-2 space-y-1.5">
            <Label>Lines *</Label>
            <div className="flex flex-wrap gap-2">
              {linesEnum.map((l) => {
                const checked = form.lines.includes(l);
                return (
                  <label
                    key={l}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                      checked ? 'bg-primary/10' : 'bg-background'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleLine(l, !!v)}
                      aria-label={l}
                    />
                    <span>{l}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))}
              />
              <span className="text-sm font-medium">Ativa</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : mode === 'create' ? 'Criar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
