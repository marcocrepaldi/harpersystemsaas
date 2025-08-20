import { useQuery } from "@tanstack/react-query";
import { Cliente } from "@/stores/cliente.store";

const mock: Cliente[] = [
  { id: "cli_1", nome: "Viramundo LTDA", cnpj: "12.345.678/0001-90" },
  { id: "cli_2", nome: "Acme S.A.", cnpj: "98.765.432/0001-10" },
  { id: "cli_3", nome: "Harper Tech ME", cnpj: "01.234.567/0001-00" },
];

export function useClients(search?: string) {
  return useQuery({
    queryKey: ["health", "clients", search ?? ""],
    queryFn: async () => {
      // Trocar por:
      // return apiFetch<Cliente[]>(`/api/health/clients?search=${encodeURIComponent(search??"")}`);
      await new Promise((r) => setTimeout(r, 200));
      if (!search) return mock;
      const s = search.toLowerCase();
      return mock.filter((c) => c.nome.toLowerCase().includes(s) || (c.cnpj ?? "").includes(s));
    },
    staleTime: 10_000,
  });
}
