"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientSwitch } from "@/components/health/client-switch";

export default function HealthClienteHome() {
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
                <BreadcrumbItem><BreadcrumbPage>Cliente: {clienteId}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4">
            <ClientSwitch />
          </div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="bg-muted/50 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href={`/health/${clienteId}/beneficiaries`} className="block">
                <Card className="h-full hover:bg-muted transition">
                  <CardHeader><CardTitle className="text-base">Beneficiários</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Lista hierárquica (Titular → Dependentes).
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/health/${clienteId}/import`} className="block">
                <Card className="h-full hover:bg-muted transition">
                  <CardHeader><CardTitle className="text-base">Importar Fatura</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Upload CSV/XLSX e prévia de conciliação.
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/health/${clienteId}/reconciliation`} className="block">
                <Card className="h-full hover:bg-muted transition">
                  <CardHeader><CardTitle className="text-base">Conciliação</CardTitle></CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Três colunas: divergências, a mais e a menos.
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
