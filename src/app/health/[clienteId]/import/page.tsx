"use client";

import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { UploadDropzone } from "@/components/health/upload-dropzone";
import { ClientSwitch } from "@/components/health/client-switch";

export default function ImportInvoicePage() {
  const { clienteId } = useParams<{ clienteId: string }>();

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
            <UploadDropzone />
            <p className="text-xs opacity-70">
              Após gerar a prévia, acesse <strong>/health/{clienteId}/reconciliation</strong>.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
