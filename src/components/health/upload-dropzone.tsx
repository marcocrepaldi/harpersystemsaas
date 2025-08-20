"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useReconciliationPreview } from "@/hooks/useReconciliation";
import { useReconciliationStore } from "@/stores/reconciliation.store";
import { toast } from "sonner";

const ACCEPTED_MIME = new Set<string>([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MAX_SIZE_MB = 10;

export function UploadDropzone() {
  const { clienteId } = useParams<{ clienteId?: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const preview = useReconciliationPreview();
  const { setResult } = useReconciliationStore();

  const onChoose = () => inputRef.current?.click();

  const onFile = (f: File | null) => {
    if (!f) return setFile(null);

    // validações
    const sizeMb = f.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      toast.error(`Arquivo muito grande`, {
        description: `Tamanho máximo: ${MAX_SIZE_MB} MB`,
      });
      return;
    }
    // tipo: alguns navegadores podem não setar corretamente, então aceitamos por extensão se MIME vier vazio
    const okMime = !f.type || ACCEPTED_MIME.has(f.type);
    const okExt = /\.(csv|xls|xlsx)$/i.test(f.name);
    if (!okMime && !okExt) {
      toast.error("Formato não suportado", {
        description: "Envie CSV, XLS ou XLSX.",
      });
      return;
    }

    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onSubmit = async () => {
    if (!clienteId) {
      toast.error("Selecione um cliente antes de importar a fatura.");
      return;
    }
    if (!file) return;

    const fd = new FormData();
    fd.append("invoice", file);

    try {
      const res = await preview.mutateAsync({ clienteId, formData: fd });
      setResult(res);
      toast.success("Prévia de conciliação gerada");
    } catch (e) {
      toast.error("Falha ao processar fatura");
    } finally {
      // opcional: manter o arquivo para reprocesso; aqui vamos limpar
      clearFile();
    }
  };

  const isBusy = preview.isPending;

  return (
    <div className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <div className="text-sm font-medium">Importar Fatura da Operadora</div>
        <div className="text-xs opacity-70">
          Arquivos CSV/XLS/XLSX • Máx {MAX_SIZE_MB}MB. O mapeamento de colunas será
          inferido/ajustado.
        </div>
        {file && (
          <div className="mt-1 text-xs">
            Selecionado: <span className="font-medium">{file.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".csv, .xls, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />

        <Button variant="secondary" onClick={onChoose} disabled={isBusy}>
          Escolher arquivo
        </Button>

        {file && (
          <Button variant="ghost" onClick={clearFile} disabled={isBusy}>
            Limpar
          </Button>
        )}

        <Button onClick={onSubmit} disabled={!file || isBusy} aria-busy={isBusy}>
          {isBusy ? "Processando…" : "Gerar Prévia"}
        </Button>
      </div>
    </div>
  );
}
