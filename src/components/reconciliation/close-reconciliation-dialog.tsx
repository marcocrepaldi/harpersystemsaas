'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function parseCurrency(input: string): number {
  if (!input) return 0;
  const raw = input.replace(/[^\d.,\-]/g, '');
  if (!raw) return 0;
  if (raw.includes(',')) return Number(raw.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(raw) || 0;
}

function toBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

type Props = {
  disabled?: boolean;
  suggestedTotal?: number;
  pending?: boolean;
  onConfirm: (p: { total: number; notes?: string }) => void;
  triggerLabel?: string;
};

export default function CloseReconciliationDialog({
  disabled,
  suggestedTotal,
  pending,
  onConfirm,
  triggerLabel = 'Fechar mês',
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [totalStr, setTotalStr] = React.useState(
    suggestedTotal != null ? toBRL(suggestedTotal) : ''
  );
  const [notes, setNotes] = React.useState('');

  const handleUseSuggested = () => {
    if (suggestedTotal != null) setTotalStr(toBRL(suggestedTotal));
  };

  const handleConfirm = () => {
    const total = parseCurrency(totalStr);
    onConfirm({ total, notes: notes.trim() || undefined });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled || pending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          // se você adicionou o variant "success", pode usar: variant="success"
        >
          {pending ? 'Fechando...' : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar conciliação do mês</DialogTitle>
          <DialogDescription>
            Confirme o valor total da fatura e, opcionalmente, registre observações. Após o fechamento, as comissões serão geradas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1">
            <Label>Valor total da fatura</Label>
            <div className="flex gap-2">
              <Input
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                placeholder="R$ 0,00"
              />
              <Button type="button" variant="secondary" onClick={handleUseSuggested} disabled={suggestedTotal == null}>
                Usar soma
              </Button>
            </div>
            {suggestedTotal != null ? (
              <span className="text-xs text-muted-foreground">
                Soma atual dos itens da fatura: <strong>{toBRL(suggestedTotal)}</strong>
              </span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas do fechamento, diferenças, acordos, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
