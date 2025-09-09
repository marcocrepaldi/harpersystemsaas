import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import BeneficiaryForm from './beneficiary-form';
import { apiFetch } from '@/lib/api';
import { notFound } from 'next/navigation';
import { ClientSwitch } from '@/components/health/client-switch';
import { unstable_noStore as noStore } from 'next/cache';

/* ======================= Tipos ======================= */
type BeneficiaryData = {
  id: string;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;

  // ——— Campos “core” do beneficiário
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
  estado?: string | null; // UF
  contrato?: string | null;
  comentario?: string | null;

  // ——— Novos campos do schema
  status?: 'ATIVO' | 'INATIVO';
  dataSaida?: string | null;
  regimeCobranca?: 'MENSAL' | 'DIARIO' | null;
  motivoMovimento?: 'INCLUSAO' | 'EXCLUSAO' | 'ALTERACAO' | 'NENHUM' | null;
  observacoes?: string | null;

  // ——— Campos “Operadora/CSV” (mantém padrão do backend)
  Empresa?: string | null;
  Cpf?: string | null; // pode coexistir com `cpf`
  Usuario?: string | null;
  Nm_Social?: string | null;
  Estado_Civil?: string | null;
  Data_Nascimento?: string | null;
  Sexo?: string | null; // pode coexistir com `sexo`
  Identidade?: string | null;
  Orgao_Exp?: string | null;
  Uf_Orgao?: string | null;
  Uf_Endereco?: string | null;
  Cidade?: string | null;
  Tipo_Logradouro?: string | null;
  Logradouro?: string | null;
  Numero?: string | null;
  Complemento?: string | null;
  Bairro?: string | null;
  Cep?: string | null;
  Fone?: string | null;
  Celular?: string | null;
  Plano?: string | null;     // pode coexistir com `plano`
  Matricula?: string | null; // pode coexistir com `matricula`
  Filial?: string | null;
  Codigo_Usuario?: string | null;
  Dt_Admissao?: string | null;
  Codigo_Congenere?: string | null;
  Nm_Congenere?: string | null;
  Tipo_Usuario?: string | null;
  Nome_Mae?: string | null;
  Pis?: string | null;
  Cns?: string | null;
  Ctps?: string | null;
  Serie_Ctps?: string | null;
  Data_Processamento?: string | null;
  Data_Cadastro?: string | null;
  Unidade?: string | null;
  Descricao_Unidade?: string | null;
  Cpf_Dependente?: string | null;
  Grau_Parentesco?: string | null;
  Dt_Casamento?: string | null;
  Nu_Registro_Pessoa_Natural?: string | null;
  Cd_Tabela?: string | null;
  Empresa_Utilizacao?: string | null;
  Dt_Cancelamento?: string | null;
};

/* helpers: formata para <input type="date" /> */
const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : '');

/* Lista de campos CSV que são datas e precisam ser normalizadas para yyyy-mm-dd */
const CSV_DATE_KEYS: Array<keyof BeneficiaryData> = [
  'Data_Nascimento',
  'Dt_Admissao',
  'Data_Processamento',
  'Data_Cadastro',
  'Dt_Casamento',
  'Dt_Cancelamento',
];

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

  // Remove apenas campos não editáveis do state inicial
  const {
    id: _id,
    clientId: _clientId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...safe
  } = beneficiaryData as any;

  // Normalizações gerais do formulário
  const normalizedCore = {
    ...safe,
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

  // Normaliza datas específicas dos campos CSV mantendo o nome do backend
  const normalizedCsvDates: Partial<BeneficiaryData> = {};
  for (const key of CSV_DATE_KEYS) {
    normalizedCsvDates[key] = toDateInput((safe as any)[key] ?? null) as any;
  }

  // initialValues final: inclui TODOS os campos (core + CSV)
  const initialValues = {
    ...normalizedCore,

    // —— Campos CSV com nome de backend (mantidos 1:1)
    Empresa: safe.Empresa ?? '',
    Cpf: safe.Cpf ?? '', // coexistente com cpf
    Usuario: safe.Usuario ?? '',
    Nm_Social: safe.Nm_Social ?? '',
    Estado_Civil: safe.Estado_Civil ?? '',
    Data_Nascimento: normalizedCsvDates.Data_Nascimento ?? '',
    Sexo: safe.Sexo ?? '',
    Identidade: safe.Identidade ?? '',
    Orgao_Exp: safe.Orgao_Exp ?? '',
    Uf_Orgao: safe.Uf_Orgao ?? '',
    Uf_Endereco: safe.Uf_Endereco ?? '',
    Cidade: safe.Cidade ?? '',
    Tipo_Logradouro: safe.Tipo_Logradouro ?? '',
    Logradouro: safe.Logradouro ?? '',
    Numero: safe.Numero ?? '',
    Complemento: safe.Complemento ?? '',
    Bairro: safe.Bairro ?? '',
    Cep: safe.Cep ?? '',
    Fone: safe.Fone ?? '',
    Celular: safe.Celular ?? '',
    Plano: safe.Plano ?? '',
    Matricula: safe.Matricula ?? '',
    Filial: safe.Filial ?? '',
    Codigo_Usuario: safe.Codigo_Usuario ?? '',
    Dt_Admissao: normalizedCsvDates.Dt_Admissao ?? '',
    Codigo_Congenere: safe.Codigo_Congenere ?? '',
    Nm_Congenere: safe.Nm_Congenere ?? '',
    Tipo_Usuario: safe.Tipo_Usuario ?? '',
    Nome_Mae: safe.Nome_Mae ?? '',
    Pis: safe.Pis ?? '',
    Cns: safe.Cns ?? '',
    Ctps: safe.Ctps ?? '',
    Serie_Ctps: safe.Serie_Ctps ?? '',
    Data_Processamento: normalizedCsvDates.Data_Processamento ?? '',
    Data_Cadastro: normalizedCsvDates.Data_Cadastro ?? '',
    Unidade: safe.Unidade ?? '',
    Descricao_Unidade: safe.Descricao_Unidade ?? '',
    Cpf_Dependente: safe.Cpf_Dependente ?? '',
    Grau_Parentesco: safe.Grau_Parentesco ?? '',
    Dt_Casamento: normalizedCsvDates.Dt_Casamento ?? '',
    Nu_Registro_Pessoa_Natural: safe.Nu_Registro_Pessoa_Natural ?? '',
    Cd_Tabela: safe.Cd_Tabela ?? '',
    Empresa_Utilizacao: safe.Empresa_Utilizacao ?? '',
    Dt_Cancelamento: normalizedCsvDates.Dt_Cancelamento ?? '',
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
