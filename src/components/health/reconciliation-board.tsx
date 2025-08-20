'use client';
import { useReconciliationStore } from '@/stores/reconciliation.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReconciliationItemCard } from './reconciliation-item-card';

export function ReconciliationBoard() {
  const { result } = useReconciliationStore();

  if (!result) {
    return <Card><CardHeader><CardTitle>Conciliação</CardTitle></CardHeader><CardContent>Envie uma fatura para iniciar.</CardContent></Card>;
  }

  const { divergenciasValor, aMaisNaFatura, aMenosNaFatura } = result;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="min-h-[60vh]">
        <CardHeader><CardTitle>Divergências de Valor</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {divergenciasValor.map((item) => (
            <ReconciliationItemCard
              key={`div-${item.cpf}-${item.invoiceRowId ?? ''}`}
              title={`${item.nome} (${item.cpf})`}
              subtitle={`Nosso: R$ ${item.nossoValor.toFixed(2)} • Operadora: R$ ${item.valorOperadora.toFixed(2)}`}
              primaryAction={{ label: 'Atualizar para Operadora', action: { type: 'updateValue', payload: item } }}
              secondaryAction={{ label: 'Manter Nosso Valor', action: { type: 'ignoreDiff', payload: item } }}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-[60vh]">
        <CardHeader><CardTitle>A mais na Fatura</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {aMaisNaFatura.map((item) => (
            <ReconciliationItemCard
              key={`amais-${item.cpf}-${item.invoiceRowId}`}
              title={`${item.nome} (${item.cpf})`}
              subtitle={`Cobrado: R$ ${item.valorOperadora.toFixed(2)}`}
              primaryAction={{ label: 'Cadastrar Beneficiário', action: { type: 'createBeneficiary', payload: item } }}
              secondaryAction={{ label: 'Ignorar', action: { type: 'ignoreCharge', payload: item } }}
            />
          ))}
        </CardContent>
      </Card>

      <Card className="min-h-[60vh]">
        <CardHeader><CardTitle>A menos na Fatura</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {aMenosNaFatura.map((item) => (
            <ReconciliationItemCard
              key={`amenos-${item.cpf}-${item.beneficiarioId}`}
              title={`${item.nome} (${item.cpf})`}
              subtitle={`Nosso valor: R$ ${item.nossoValor.toFixed(2)}`}
              primaryAction={{ label: 'Inativar Beneficiário', action: { type: 'inactivateBeneficiary', payload: item } }}
              secondaryAction={{ label: 'Marcar p/Investigar', action: { type: 'flagInvestigate', payload: item } }}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
