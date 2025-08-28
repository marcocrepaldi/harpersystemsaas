'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

export type ImportErrorItem = {
  id: string;
  clientId: string;
  linha: number | null;
  motivo: string;
  dados: any;
  createdAt: string;
};

export type ImportErrorsResponse = {
  items: ImportErrorItem[];
  page: number;
  limit: number;
  total: number;
};

type Tab = 'latest' | 'history';

type UseImportErrorsParams = {
  clientId: string;
  query?: string;
  tab?: Tab;
};

export function useImportErrors({ clientId, query = '', tab = 'latest' }: UseImportErrorsParams) {
  const qc = useQueryClient();

  // Busca SEMPRE no servidor (paginado; pegue mais se quiser)
  const { data, isFetching, refetch } = useQuery<ImportErrorsResponse>({
    queryKey: ['import-errors', clientId, tab, query],
    queryFn: async () =>
      apiFetch<ImportErrorsResponse>(`/clients/${clientId}/import-errors`, {
        query: {
          search: query || undefined,
          page: 1,
          limit: 200, // aumente aqui se precisar listar mais linhas de uma vez
        },
      }),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  // Limpar histórico
  const clearMutation = useMutation({
    mutationFn: async () =>
      apiFetch<{ message: string; deletedCount: number }>(
        `/clients/${clientId}/import-errors`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-errors', clientId] });
    },
    onError: (e: unknown) => {
      console.error(e);
      throw e;
    },
  });

  // Para o modal, tratamos as duas abas como a mesma fonte (servidor).
  const history = data?.items ?? [];
  const latest = data?.items ?? [];

  const exportCsvPayload = (which: Tab) => {
    const src = which === 'history' ? history : latest;
    return src.map((r) => ({
      id: r.id,
      clientId: r.clientId,
      linha: r.linha ?? '',
      motivo: r.motivo,
      dados: JSON.stringify(r.dados),
      createdAt: r.createdAt,
    }));
  };

  const clearAll = async () => {
    try {
      await clearMutation.mutateAsync();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  };

  return {
    isLoading: isFetching,
    latest,
    history,
    refetch,
    clearAll,
    exportCsvPayload,
  };
}
