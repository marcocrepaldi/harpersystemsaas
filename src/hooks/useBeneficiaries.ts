import { useQuery } from "@tanstack/react-query";
import { Beneficiary } from "@/app/types/health";
// import { apiFetch } from "@/lib/api";

const mock: Beneficiary[] = [
  {
    id: "t1",
    clienteId: "cli_1",
    nomeCompleto: "João Titular",
    cpf: "111.111.111-11",
    tipo: "Titular",
    dataEntrada: "2025-01-01",
    valorMensalidade: 350.0,
    status: "Ativo",
    dependentes: [
      {
        id: "d1",
        clienteId: "cli_1",
        titularId: "t1",
        nomeCompleto: "Maria Dependente",
        cpf: "222.222.222-22",
        tipo: "Dependente",
        dataEntrada: "2025-02-01",
        valorMensalidade: 180.0,
        status: "Ativo",
      },
    ],
  },
];

export function useBeneficiaries(params: { clienteId: string }) {
  const { clienteId } = params;
  return useQuery({
    queryKey: ["health", "beneficiaries", { clienteId }],
    queryFn: async () => {
      // Ex. real:
      // return apiFetch<{ items: Beneficiary[]; page: number; total: number }>(
      //   `/api/health/beneficiaries?clienteId=${encodeURIComponent(clienteId)}`
      // );
      await new Promise((r) => setTimeout(r, 300));
      const items = mock.filter((b) => b.clienteId === clienteId);
      return { items, page: 1, total: items.length };
    },
    enabled: Boolean(clienteId),
    staleTime: 10_000,
  });
}
