'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

export type PlanRow = {
  id: string;
  nome: string;
  tipo: 'SAUDE' | 'DENTAL';
  centroCusto?: string | null;
  contrato?: string | null;
  regimeCobranca?: 'MENSAL' | 'DIARIO' | null;
  ativo: boolean;
  // tabela de preços por faixa
  valores: Array<{ faixa: string; valor: number }>;
  observacoes?: string | null;
};

export type PlanInput = Omit<PlanRow, 'id'>;

const DEFAULT_BANDS = ['0–18','19–23','24–28','29–33','34–38','39–43','44–48','49–53','54–58','59+'];

export default function PlanForm({
  clienteId,
  initialValues,
  onSaved,
  onCancel,
}: {
  clienteId: string;
  initialValues?: PlanRow;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const isEdit = !!initialValues?.id;
  const [nome, setNome] = React.useState(initialValues?.nome ?? '');
  const [tipo, setTipo] = React.useState<'SAUDE'|'DENTAL'>(initialValues?.tipo ?? 'SAUDE');
  const [centroCusto, setCentroCusto] = React.useState(initialValues?.centroCusto ?? '');
  const [contrato, setContrato] = React.useState(initialValues?.contrato ?? '');
  const [regimeCobranca, setRegimeCobranca] = React.useState<'MENSAL'|'DIARIO'|''>((initialValues?.regimeCobranca ?? '') as any);
  const [ativo, setAtivo] = React.useState<boolean>(initialValues?.ativo ?? true);
  const [observacoes, setObservacoes] = React.useState(initialValues?.observacoes ?? '');

  const [valores, setValores] = React.useState<Array<{ faixa: string; valor: number }>>(
    initialValues?.valores?.length
      ? initialValues.valores
      : DEFAULT_BANDS.map(faixa => ({ faixa, valor: 0 }))
  );

  const setValor = (faixa: string, valor: number) => {
    setValores(prev => prev.map(v => v.faixa === faixa ? { ...v, valor } : v));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: PlanInput = {
        nome,
        tipo,
        centroCusto: centroCusto || null,
        contrato: contrato || null,
        regimeCobranca: (regimeCobranca || null) as any,
        ativo,
        valores,
        observacoes: observacoes || null,
      };
      if (isEdit) {
        return apiFetch(`/clients/${clienteId}/plans/${initialValues!.id}`, { method: 'PATCH', body: payload });
      }
      return apiFetch(`/clients/${clienteId}/plans`, { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success(`Plano ${isEdit ? 'atualizado' : 'criado'} com sucesso!`);
      onSaved?.();
    },
    onError: (e) => toast.error('Falha ao salvar plano.', { description: errorMessage(e) }),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-1 md:col-span-2">
          <Label>Nome do Plano *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="grid gap-1">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SAUDE">Saúde</SelectItem>
              <SelectItem value="DENTAL">Dental</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label>Centro de Custo</Label>
          <Input value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>Contrato</Label>
          <Input value={contrato} onChange={(e) => setContrato(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <Label>Regime de Cobrança</Label>
          <Select value={regimeCobranca || ''} onValueChange={(v) => setRegimeCobranca(v as any)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">—</SelectItem>
              <SelectItem value="MENSAL">Mensal</SelectItem>
              <SelectItem value="DIARIO">Diário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Checkbox checked={ativo} onCheckedChange={(c) => setAtivo(!!c)} id="ativo" />
          <Label htmlFor="ativo">Ativo</Label>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {valores.map((v) => (
              <div key={v.faixa} className="grid gap-1">
                <Label>{v.faixa}</Label>
                <Input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={v.valor}
                  onChange={(e) => setValor(v.faixa, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-1">
        <Label>Observações</Label>
        <Textarea value={observacoes ?? ''} onChange={(e) => setObservacoes(e.target.value)} />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Salvando...' : (isEdit ? 'Salvar alterações' : 'Criar plano')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancelar</Button>
      </div>
    </form>
  );
}
