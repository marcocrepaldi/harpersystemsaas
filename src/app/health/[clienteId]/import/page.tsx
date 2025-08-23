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
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ClientSwitch } from "@/components/health/client-switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "./upload-dropzone";

export default function ImportInvoicePage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();

  // Mutation para upload da fatura
  const uploadInvoiceMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Se quiser permitir escolher a competência no futuro:
      // const mes = "2025-08"; formData.append('mes', mes); // alternativa via query

      // IMPORTANTE: apiFetch deve prefixar com /api (ex.: http://localhost:3001/api)
      return apiFetch<any>(`/clients/${clienteId}/invoices/upload`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      toast.success(data?.ok ? "Fatura importada com sucesso!" : (data?.message ?? "Fatura processada."), {
        description: data?.totals
          ? `Processadas: ${data.totals.processed} / ${data.totals.totalRows}.`
          : data?.processedRows
          ? `${data.processedRows} linhas salvas.`
          : undefined,
      });

      // Redireciona para a tela de conciliação
      router.push(`/health/${clienteId}/reconciliation`);
    },
    onError: (e) => {
      toast.error("Falha ao importar fatura.", { description: errorMessage(e) });
    },
  });

  const handleFileAccepted = (file: File | null) => {
    if (file) uploadInvoiceMutation.mutate(file);
  };

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
                <BreadcrumbItem><BreadcrumbLink href="/health">Rota de Saúde</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbLink href={`/health/${clienteId}`}>Cliente</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Importar Fatura</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4"><ClientSwitch /></div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="bg-muted/50 rounded-xl p-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Importar Fatura da Operadora</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">
                  Envie o arquivo CSV/XLS/XLSX (ex.: <em>Hapvida.csv</em>) para iniciar a conciliação.
                  <br />
                  <span className="text-xs">Layout esperado: colunas de beneficiário, CPF e valor (o sistema tenta mapear variações automaticamente).</span>
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
