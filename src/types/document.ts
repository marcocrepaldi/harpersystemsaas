// Tipos alinhados ao backend

export type DocumentCategory =
  | 'APOLICE'
  | 'PROPOSTA'
  | 'CONTRATO'
  | 'FATURA'
  | 'ANEXO'
  | 'ADITIVO'
  | 'BOLETIMDEOCORRENCIA'
  | 'AVISODESINISTRO'
  | 'LAUDODEPERICIA'
  | 'COMUNICADODEACIDENTE'
  | 'COMPROVANTEDERESIDENCIA'
  | 'RELATORIODEREGULACAO'
  | 'DOCUMENTO'
  | 'OUTRO';

export type DocumentFromApi = {
  id: string;
  corretorId: string;
  clientId: string;
  policyId?: string | null;

  filename: string;
  mimeType: string;
  size: number;
  category: DocumentCategory;
  tags: string[];
  notes?: string | null;

  storageKey: string;
  checksum?: string | null;

  createdBy?: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string | null;
};

export type DocumentListResponse = {
  items: DocumentFromApi[];
  total: number;
  page: number;
  pageCount: number;
};
