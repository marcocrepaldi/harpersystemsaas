"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { ClientSwitch } from "@/components/health/client-switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EditBeneficiaryPage() {
  const { clienteId, id } = useParams<{ clienteId: string; id: string }>();
  const router = useRouter();
  const [nome, setNome] = useState("Fulano da Silva");
  const [valor, setValor] = useState("299.90");

  const onSave = () => {
    toast.success(`Beneficiário ${id} atualizado (mock)`);
    router.push(`/health/${clienteId}/beneficiaries`);
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
                <BreadcrumbItem><BreadcrumbLink href={`/health/${clienteId}/beneficiaries`}>Beneficiários</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Editar</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4"><ClientSwitch /></div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="bg-muted/50 rounded-xl p-6">
            <Card className="max-w-2xl">
              <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome completo</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div>
                    <Label>Valor mensalidade (R$)</Label>
                    <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => router.back()}>Voltar</Button>
                  <Button onClick={onSave}>Salvar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
