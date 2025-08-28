import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import BeneficiaryForm from './beneficiary-form';
import { apiFetch } from '@/lib/api';
import { notFound } from 'next/navigation';
import { ClientSwitch } from '@/components/health/client-switch';
import { unstable_noStore as noStore } from 'next/cache';

type BeneficiaryData = {
  id: string;
  clientId?: string; // pode vir da API, mas não vai para o form
  createdAt?: string;
  updatedAt?: string;

  nomeCompleto: string;
  cpf?: string | null;
  tipo: 'TITULAR' | 'FILHO' | 'CONJUGE';
  dataEntrada: string;
  dataNascimento?: string | null;
  valorMensalidade?: string | number | null;
  titularId?: string | null;
  matricula?: string | null;
  carteirinha?: string | null;
  sexo?: 'M' | 'F' | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;
  estado?: string | null;
  contrato?: string | null;
  comentario?: string | null;

  // novos campos do schema
  status?: 'ATIVO' | 'INATIVO';
  dataSaida?: string | null;
  regimeCobranca?: 'MENSAL' | 'DIARIO' | null;
  motivoMovimento?: 'INCLUSAO' | 'EXCLUSAO' | 'ALTERACAO' | 'NENHUM' | null;
  observacoes?: string | null;
};

// helper: formata para <input type="date" />
const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

export default async function EditBeneficiaryPage({
  params,
}: {
  // Next 15: params é assíncrono
  params: Promise<{ clienteId: string; id: string }>;
}) {
  noStore();

  const { clienteId, id } = await params;

  let beneficiaryData: BeneficiaryData;
  try {
    beneficiaryData = await apiFetch<BeneficiaryData>(`/clients/${clienteId}/beneficiaries/${id}`);
  } catch {
    return notFound();
  }

  // Remover apenas campos não editáveis/irrelevantes do state inicial
  const {
    id: _id,
    clientId: _clientId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...safe
  } = beneficiaryData as any;

  const initialValues = {
    ...safe,
    // normalizações para o form
    dataEntrada: toDateInput(safe.dataEntrada),
    dataNascimento: toDateInput(safe.dataNascimento ?? null),
    dataSaida: toDateInput(safe.dataSaida ?? null),

    // garantir string no campo de valor quando vier number/decimal
    valorMensalidade:
      safe.valorMensalidade == null ? '' : String(safe.valorMensalidade),

    // undefined em vez de null para selects controlados
    sexo: (safe.sexo ?? undefined) as 'M' | 'F' | undefined,
    titularId: safe.titularId ?? undefined,
    tipo: (safe.tipo ?? 'TITULAR') as 'TITULAR' | 'FILHO' | 'CONJUGE',
    status: (safe.status ?? undefined) as 'ATIVO' | 'INATIVO' | undefined,
    regimeCobranca: (safe.regimeCobranca ?? undefined) as 'MENSAL' | 'DIARIO' | undefined,
    motivoMovimento: (safe.motivoMovimento ?? undefined) as
      | 'INCLUSAO'
      | 'EXCLUSAO'
      | 'ALTERACAO'
      | 'NENHUM'
      | undefined,
    observacoes: safe.observacoes ?? '',
  } as const;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="/health">Saúde</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbLink href={`/health/${clienteId}/beneficiaries`}>Beneficiários</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{beneficiaryData.nomeCompleto}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4">
            <ClientSwitch clienteId={clienteId} />
          </div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="bg-muted/50 rounded-xl p-6">
            <BeneficiaryForm
              mode="edit"
              clienteId={clienteId}
              beneficiaryId={id}
              initialValues={initialValues}
              onSuccessRedirect={`/health/${clienteId}/beneficiaries`}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
