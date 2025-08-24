"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

// Layout & UI
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ClientSwitch } from "@/components/health/client-switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "./upload-dropzone";

export default function ImportInvoicePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();
  const abortRef = React.useRef<AbortController | null>(null);

  const uploadInvoiceMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!clienteId) throw new Error("Cliente inválido.");
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const formData = new FormData();
      formData.append("file", file);

      return apiFetch<any>(`/clients/${clienteId}/invoices/upload`, {
        method: "POST",
        body: formData,
        signal: abortRef.current.signal,
      });
    },
onSuccess: (data) => {
  const okMsg = data?.message || "Fatura importada com sucesso!";
  const parts: string[] = [];

  if (typeof data?.processedRows === "number" && typeof data?.totalRows === "number") {
    parts.push(`Processadas: ${data.processedRows}/${data.totalRows}`);
  }
  if (data?.detectedColumns) {
    const d = data.detectedColumns;
    parts.push(
      `Detectado -> nome: ${d.nome ?? "—"}, cpf: ${d.cpf ?? "—"}, valor: ${d.valor ?? "—"}`
    );
  }
  toast.success(okMsg, { description: parts.join(" • ") || undefined });
  router.push(`/health/${clienteId}/reconciliation`);
},

    onError: (e) => {
      const msg = errorMessage(e);
      if (msg?.toLowerCase().includes("nenhum arquivo")) {
        toast.error("Nenhum arquivo enviado.");
      } else {
        toast.error("Falha ao importar fatura.", { description: msg });
      }
    },
  });

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFileAccepted = React.useCallback(
    (file: File | null) => {
      if (!file || uploadInvoiceMutation.isPending) return;
      uploadInvoiceMutation.mutate(file);
    },
    [uploadInvoiceMutation],
  );

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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/health">Rota de Saúde</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/health/${clienteId}`}>Cliente</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Importar Fatura</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4">
            <ClientSwitch />
          </div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="bg-muted/50 rounded-xl p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Fatura da Operadora</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">
                  Envie o arquivo CSV/XLS/XLSX (ex.: <em>Hapvida.csv</em>) para iniciar a conciliação.
                  <br />
                  <span className="text-xs">
                    Layout esperado: colunas de beneficiário, CPF e valor. O sistema tenta mapear variações automaticamente.
                  </span>
                </p>
              </CardHeader>
              <CardContent>
                <UploadDropzone
                  onFileAccepted={handleFileAccepted}
                  isUploading={uploadInvoiceMutation.isPending}
                />
              </CardContent>
            </Card>

            <p className="text-xs opacity-70 text-center">
              Após o envio, você será redirecionado para a tela de conciliação.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
