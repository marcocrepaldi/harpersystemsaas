import { useMutation } from "@tanstack/react-query";
import { ReconciliationResult } from "@/app/types/health";
// import { apiFetch } from "@/lib/api";

function fakePreview(): Promise<ReconciliationResult> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          divergenciasValor: [
            { cpf: "111.111.111-11", nome: "João Titular", nossoValor: 350, valorOperadora: 360, beneficiarioId: "t1", invoiceRowId: "r1" },
          ],
          aMaisNaFatura: [
            { cpf: "999.999.999-99", nome: "Pessoa Desconhecida", valorOperadora: 200, invoiceRowId: "r2" },
          ],
          aMenosNaFatura: [
            { cpf: "333.333.333-33", nome: "Carlos Titular", nossoValor: 420, beneficiarioId: "t2" },
          ],
        }),
      600
    )
  );
}

export function useReconciliationPreview() {
  return useMutation({
    mutationFn: async (payload: { clienteId: string; formData: FormData }) => {
      const { formData } = payload;
      // return apiFetch<ReconciliationResult>(`/api/health/reconciliation/preview?clienteId=${encodeURIComponent(payload.clienteId)}`, { method: "POST", body: formData });
      return fakePreview();
    },
  });
}
