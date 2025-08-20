export type BeneficiaryType = "Titular" | "Dependente";
export type BeneficiaryStatus = "Ativo" | "Inativo";

export type Beneficiary = {
  id: string;
  clienteId: string;
  titularId?: string | null;
  nomeCompleto: string;
  cpf: string;
  tipo: BeneficiaryType;
  dataEntrada: string; // ISO
  dataSaida?: string | null;
  valorMensalidade: number;
  status: BeneficiaryStatus;
  dependentes?: Beneficiary[];
};

export type BillingRule = {
  id: string;
  descricao: string;
  dataCorteCobranca: number; // dia do mês (1-31)
};

export type ImportedInvoiceRow = {
  id: string;
  clienteId: string;
  mesReferencia: string; // YYYY-MM
  nomeBeneficiarioOperadora: string;
  cpfBeneficiarioOperadora: string;
  valorCobradoOperadora: number;
};

export type DivergenciaValor = {
  cpf: string;
  nome: string;
  nossoValor: number;
  valorOperadora: number;
  beneficiarioId?: string;
  invoiceRowId?: string;
};

export type AmaisOperadora = {
  cpf: string;
  nome: string;
  valorOperadora: number;
  invoiceRowId: string;
};

export type AmenosOperadora = {
  cpf: string;
  nome: string;
  nossoValor: number;
  beneficiarioId: string;
};

export type ReconciliationResult = {
  divergenciasValor: DivergenciaValor[];
  aMaisNaFatura: AmaisOperadora[];
  aMenosNaFatura: AmenosOperadora[];
};
