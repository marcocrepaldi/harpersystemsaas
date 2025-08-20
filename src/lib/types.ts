// lib/types.ts
export type PageResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export interface Client {
  id: string;
  corretorId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null; // CPF/CNPJ
  personType?: "PF" | "PJ" | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface ClientRow {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
}

export type CreateClientPayload = {
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  personType?: "PF" | "PJ" | null;
};

export type UpdateClientPayload = Partial<CreateClientPayload>;

export interface ApiErrorResponse {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}
