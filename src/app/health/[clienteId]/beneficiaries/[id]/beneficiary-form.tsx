"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

type BeneficiaryPayload = {
  nomeCompleto: string;
  cpf?: string | null;
  tipo: 'TITULAR' | 'DEPENDENTE';
  dataEntrada: string;
  dataNascimento?: string | null;
  valorMensalidade?: string | null;
  titularId?: string | null;
  matricula?: string | null;
  carteirinha?: string | null;
  sexo?: 'M' | 'F' | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;
  estado?: string | null; // UF
  contrato?: string | null;
  comentario?: string | null;
};

type Props = {
  mode: 'create' | 'edit';
  clienteId: string;
  beneficiaryId?: string;
  initialValues?: Partial<BeneficiaryPayload>;
  onSuccessRedirect: string;
};

type TitularOption = { id: string; nomeCompleto: string };

/* ---------------- helpers ---------------- */
const EDITABLE_KEYS: (keyof BeneficiaryPayload)[] = [
  'nomeCompleto',
  'cpf',
  'tipo',
  'dataEntrada',
  'dataNascimento',
  'valorMensalidade',
  'titularId',
  'matricula',
  'carteirinha',
  'sexo',
  'plano',
  'centroCusto',
  'faixaEtaria',
  'estado',
  'contrato',
  'comentario',
];

const trim = (v: any) => (typeof v === 'string' ? v.trim() : v);
const onlyDigits = (v?: string | null) => (v ? v.replace(/\D/g, '') : v);
const toYyyyMmDd = (v?: string | null) => (v ? String(v).slice(0, 10) : v);

/** Hidrata APENAS campos editáveis */
function normalizeForForm(iv: Partial<BeneficiaryPayload> | any): Partial<BeneficiaryPayload> {
  const out: Partial<BeneficiaryPayload> = {};

  out.nomeCompleto = trim(iv?.nomeCompleto ?? '');
  out.cpf = onlyDigits(iv?.cpf ?? '') || '';
  out.tipo = iv?.tipo ?? undefined;
  out.dataEntrada = toYyyyMmDd(iv?.dataEntrada ?? '') || '';
  out.dataNascimento = toYyyyMmDd(iv?.dataNascimento ?? '') || '';
  out.valorMensalidade = iv?.valorMensalidade ?? '';
  out.titularId = iv?.titularId ?? undefined;
  out.matricula = trim(iv?.matricula ?? '');
  out.carteirinha = trim(iv?.carteirinha ?? '');
  out.sexo = iv?.sexo ?? undefined;
  out.plano = trim(iv?.plano ?? '');
  out.centroCusto = trim(iv?.centroCusto ?? '');
  out.faixaEtaria = trim(iv?.faixaEtaria ?? '');
  out.estado = trim(iv?.estado ?? '');
  out.contrato = trim(iv?.contrato ?? '');
  out.comentario = trim(iv?.comentario ?? '');

  return out;
}

/** Monta payload apenas com chaves permitidas e valores não-vazios */
function buildPayload(fd: Partial<BeneficiaryPayload> | any): Partial<BeneficiaryPayload> {
  const p: Partial<BeneficiaryPayload> = {};

  for (const k of EDITABLE_KEYS) {
    const v = fd?.[k];
    if (v === '' || v === undefined || v === null) continue;

    if (k === 'cpf') {
      p.cpf = onlyDigits(String(v)) ?? undefined;
    } else if (k === 'valorMensalidade') {
      p.valorMensalidade = String(v).replace(',', '.');
    } else {
      p[k] = v;
    }
  }

  if (p.tipo) p.tipo = String(p.tipo).toUpperCase() as 'TITULAR' | 'DEPENDENTE';
  if (p.tipo !== 'DEPENDENTE') delete p.titularId;

  return p;
}

/* ---------------- component ---------------- */
export default function BeneficiaryForm({
  mode,
  clienteId,
  beneficiaryId,
  initialValues,
  onSuccessRedirect,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const [formData, setFormData] = React.useState<Partial<BeneficiaryPayload>>(
    initialValues ? normalizeForForm(initialValues) : {}
  );

  // Reidrata quando initialValues chegar/alterar (edição)
  React.useEffect(() => {
    if (mode === 'edit' && initialValues) {
      setFormData(normalizeForForm(initialValues));
    }
  }, [mode, initialValues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let v: any = value;

    if (name === 'cpf') v = onlyDigits(value);
    if (name === 'valorMensalidade') v = value; // input number já entrega com ponto
    if (type === 'date') v = value; // yyyy-mm-dd

    setFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleSelectChange = (name: keyof BeneficiaryPayload, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value as any };
      if (name === 'tipo') {
        // ao virar TITULAR, limpamos vínculo
        next.titularId = value === 'TITULAR' ? undefined : prev.titularId ?? undefined;
      }
      return next;
    });
  };

  // Carrega opções de titulares apenas quando necessário
  const { data: titulares, isLoading: isLoadingTitulares } = useQuery<TitularOption[]>({
    queryKey: ['beneficiaries', { clienteId, tipo: 'TITULAR' }],
    queryFn: () =>
      apiFetch(`/clients/${clienteId}/beneficiaries`, { query: { tipo: 'TITULAR' } }).then(
        (res: any) => res.items as TitularOption[]
      ),
    enabled: formData.tipo === 'DEPENDENTE' && !!clienteId,
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<BeneficiaryPayload>) => {
      const url =
        mode === 'create'
          ? `/clients/${clienteId}/beneficiaries`
          : `/clients/${clienteId}/beneficiaries/${beneficiaryId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      return apiFetch(url, { method, body: payload });
    },
    onSuccess: () => {
      toast.success(`Beneficiário ${mode === 'create' ? 'criado' : 'atualizado'} com sucesso!`);
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error('Falha ao salvar.', { description: errorMessage(e) }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.nomeCompleto || !formData.tipo || !formData.dataEntrada) {
      toast.error('Preencha os campos obrigatórios: Nome, Tipo e Data de Entrada.');
      return;
    }
    if (formData.tipo === 'DEPENDENTE' && !formData.titularId) {
      toast.error('Para um Dependente, é obrigatório selecionar o Titular.');
      return;
    }

    const payload = buildPayload(formData);
    mutation.mutate(payload);
  };

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Novo Beneficiário' : 'Editar Beneficiário'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="nomeCompleto">Nome Completo *</Label>
              <Input id="nomeCompleto" name="nomeCompleto" value={formData.nomeCompleto ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" name="cpf" value={formData.cpf ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={formData.tipo ?? undefined} onValueChange={(v) => handleSelectChange('tipo', v)}>
                <SelectTrigger id="tipo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TITULAR">Titular</SelectItem>
                  <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo === 'DEPENDENTE' && (
              <div className="grid gap-2">
                <Label htmlFor="titularId">Vincular ao Titular *</Label>
                <Select
                  value={formData.titularId ?? undefined}
                  onValueChange={(v) => handleSelectChange('titularId', v)}
                  disabled={isLoadingTitulares}
                >
                  <SelectTrigger id="titularId">
                    <SelectValue placeholder={isLoadingTitulares ? 'Carregando...' : 'Selecione...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {titulares?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nomeCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="dataNascimento">Data de Nascimento</Label>
              <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sexo">Sexo</Label>
              <Select value={formData.sexo ?? undefined} onValueChange={(v: 'M' | 'F') => handleSelectChange('sexo', v)}>
                <SelectTrigger id="sexo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input id="matricula" name="matricula" value={formData.matricula ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="carteirinha">Carteirinha</Label>
              <Input id="carteirinha" name="carteirinha" value={formData.carteirinha ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plano">Plano</Label>
              <Input id="plano" name="plano" value={formData.plano ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="centroCusto">Centro de Custo</Label>
              <Input id="centroCusto" name="centroCusto" value={formData.centroCusto ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="faixaEtaria">Faixa Etária</Label>
              <Input id="faixaEtaria" name="faixaEtaria" value={formData.faixaEtaria ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataEntrada">Data de Entrada (Vigência) *</Label>
              <Input id="dataEntrada" name="dataEntrada" type="date" value={formData.dataEntrada ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valorMensalidade">Valor da Mensalidade (R$)</Label>
              <Input id="valorMensalidade" name="valorMensalidade" type="number" step="0.01" value={formData.valorMensalidade ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estado">Estado (UF)</Label>
              <Input id="estado" name="estado" value={formData.estado ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="contrato">Contrato</Label>
              <Input id="contrato" name="contrato" value={formData.contrato ?? ''} onChange={handleInputChange} />
            </div>

            <div className="grid gap-2 md:col-span-3">
              <Label htmlFor="comentario">Observação / Ação</Label>
              <Textarea id="comentario" name="comentario" value={formData.comentario ?? ''} onChange={handleInputChange} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={mutation.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
