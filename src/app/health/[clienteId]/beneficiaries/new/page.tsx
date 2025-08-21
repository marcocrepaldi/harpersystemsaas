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
import { Loader2 } from 'lucide-react';

type BeneficiaryPayload = {
  nomeCompleto: string;
  cpf?: string;
  tipo: 'TITULAR' | 'DEPENDENTE';
  dataEntrada: string; // yyyy-mm-dd
  valorMensalidade?: string;
  titularId?: string;
};

type Props = {
  mode: 'create' | 'edit';
  clienteId: string;
  beneficiaryId?: string;
  initialValues?: Partial<BeneficiaryPayload>;
  onSuccessRedirect: string;
};

// Tipo para a lista de titulares que vamos buscar
type TitularOption = {
  id: string;
  nomeCompleto: string;
};

export default function BeneficiaryForm({
  mode,
  clienteId,
  initialValues,
  onSuccessRedirect,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  // Estados do formulário
  const [nomeCompleto, setNomeCompleto] = React.useState(initialValues?.nomeCompleto ?? '');
  const [cpf, setCpf] = React.useState(initialValues?.cpf ?? '');
  const [tipo, setTipo] = React.useState<'TITULAR' | 'DEPENDENTE' | ''>(initialValues?.tipo ?? '');
  const [dataEntrada, setDataEntrada] = React.useState(initialValues?.dataEntrada ?? '');
  const [valorMensalidade, setValorMensalidade] = React.useState(initialValues?.valorMensalidade ?? '');
  const [titularId, setTitularId] = React.useState(initialValues?.titularId ?? '');

  // ✅ NOVO: Hook para buscar a lista de titulares
  const { data: titulares, isLoading: isLoadingTitulares } = useQuery<TitularOption[]>({
    queryKey: ['beneficiaries', { clienteId, tipo: 'TITULAR' }],
    queryFn: () =>
      apiFetch(`/clients/${clienteId}/beneficiaries`, {
        query: { tipo: 'TITULAR', limit: 500 }, // Busca até 500 titulares
      }).then((res: any) => res.items), // A API retorna um objeto paginado
    enabled: tipo === 'DEPENDENTE', // Só busca a lista se o tipo for 'Dependente'
  });

  const mutation = useMutation({
    mutationFn: (payload: BeneficiaryPayload) => {
      const url = `/clients/${clienteId}/beneficiaries`;
      return apiFetch(url, { method: 'POST', body: payload });
    },
    onSuccess: () => {
      toast.success('Beneficiário salvo com sucesso!');
      qc.invalidateQueries({ queryKey: ['beneficiaries'] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error('Falha ao salvar beneficiário.', { description: errorMessage(e) }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!nomeCompleto || !tipo || !dataEntrada) {
      toast.error('Por favor, preencha os campos obrigatórios: Nome, Tipo e Data de Entrada.');
      return;
    }
    if (tipo === 'DEPENDENTE' && !titularId) {
      toast.error('Para um Dependente, é obrigatório selecionar o Titular.');
      return;
    }
    mutation.mutate({
      nomeCompleto,
      cpf,
      tipo,
      dataEntrada,
      valorMensalidade,
      // ✅ Adiciona o titularId ao payload se for dependente
      titularId: tipo === 'DEPENDENTE' ? titularId : undefined,
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Novo Beneficiário' : 'Editar Beneficiário'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={(v: 'TITULAR' | 'DEPENDENTE') => { setTipo(v); setTitularId(''); }}>
                <SelectTrigger id="tipo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TITULAR">Titular</SelectItem>
                  <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* ✅ NOVO: Campo condicional para selecionar o Titular */}
            {tipo === 'DEPENDENTE' && (
              <div className="grid gap-2">
                <Label htmlFor="titular">Vincular ao Titular *</Label>
                <Select value={titularId} onValueChange={setTitularId} disabled={isLoadingTitulares}>
                  <SelectTrigger id="titular">
                    <SelectValue placeholder={isLoadingTitulares ? "Carregando titulares..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {titulares && titulares.length > 0 ? (
                      titulares.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.nomeCompleto}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum titular encontrado.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="dataEntrada">Data de Entrada *</Label>
              <Input id="dataEntrada" type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mensalidade">Valor da Mensalidade (R$)</Label>
              <Input id="mensalidade" type="number" step="0.01" value={valorMensalidade} onChange={(e) => setValorMensalidade(e.target.value)} placeholder="123.45" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : 'Salvar'}
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