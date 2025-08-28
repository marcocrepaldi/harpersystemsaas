"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Protected } from "@/components/auth/protected";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Tipos de plano (iguais aos anteriores)
const tiposDePlano = [
  "COLETIVO_POR_ADESAO",
  "COLETIVO_EMPRESARIAL",
  "INDIVIDUAL_FAMILIAR",
] as const;

type TipoPlano = (typeof tiposDePlano)[number];

export default function NewPlanPage() {
  const { clienteId } = useParams<{ clienteId: string }>();

  const [planData, setPlanData] = useState<{
    nome: string;
    tipo: TipoPlano | "";
    dataVigencia: Date | null;
    codigoAns: string;
    valorMensalidade: string;
    observacoes?: string;
  }>({
    nome: "",
    tipo: "",
    dataVigencia: null,
    codigoAns: "",
    valorMensalidade: "",
    observacoes: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // helpers
  const formatCurrencyBRL = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "");
    const asNumber = Number(onlyDigits) / 100;
    return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const parseCurrencyToNumber = (masked: string) => {
    const normalized = masked.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };

  const isValid = useMemo(
    () =>
      planData.nome.trim().length > 2 &&
      !!planData.tipo &&
      !!planData.dataVigencia &&
      planData.codigoAns.trim().length >= 5,
    [planData]
  );

  // handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setPlanData((prev) => ({ ...prev, [id]: value }));
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() === "") {
      setPlanData((prev) => ({ ...prev, valorMensalidade: "" }));
      return;
    }
    setPlanData((prev) => ({ ...prev, valorMensalidade: formatCurrencyBRL(val) }));
  };

  const handleSelectChange = (value: TipoPlano) => {
    setPlanData((prev) => ({ ...prev, tipo: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setPlanData((prev) => ({ ...prev, dataVigencia: date ?? null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        nome: planData.nome.trim(),
        tipo: planData.tipo,
        dataVigencia: planData.dataVigencia?.toISOString(),
        codigoAns: planData.codigoAns.trim(),
        valorMensalidade: parseCurrencyToNumber(planData.valorMensalidade),
        observacoes: planData.observacoes?.trim() || undefined,
      };

      console.log("Dados a serem enviados:", payload);

      // await apiFetch(`/health/clients/${clienteId}/plans`, {
      //   method: "POST",
      //   body: JSON.stringify(payload),
      // });

      // router.push(`/health/${clienteId}/plans`);
    } catch (err) {
      console.error("Falha ao cadastrar o plano.", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Protected>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />

          {/* === CONTEÚDO NO PADRÃO DO CLIENTS: container à esquerda === */}
          <div className="flex-1 p-4 md:p-6">
            {/* Cabeçalho simples, alinhado à esquerda */}
            <h1 className="mb-4 text-xl font-semibold">Cadastro de Plano</h1>

            {/* Coluna esquerda, sem mx-auto, próxima da sidebar */}
            <form onSubmit={handleSubmit} className="grid gap-6 max-w-3xl">
              {/* Identificação */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Identificação do plano</CardTitle>
                  <CardDescription>Dados principais do produto contratado</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Nome do Plano</Label>
                    <Input
                      id="nome"
                      placeholder="Ex.: Plano Ouro"
                      value={planData.nome}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tipo">Tipo de Plano</Label>
                    <Select value={planData.tipo} onValueChange={handleSelectChange}>
                      <SelectTrigger id="tipo" className="w-full">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposDePlano.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="codigoAns">Código ANS</Label>
                    <Input
                      id="codigoAns"
                      inputMode="numeric"
                      placeholder="Ex.: 123456"
                      value={planData.codigoAns}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dataVigencia">Data de Vigência</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="dataVigencia"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !planData.dataVigencia && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {planData.dataVigencia
                            ? format(planData.dataVigencia, "dd/MM/yyyy")
                            : "Escolha uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={planData.dataVigencia ?? undefined}
                          onSelect={handleDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

              {/* Condições financeiras */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Condições financeiras</CardTitle>
                  <CardDescription>Valores e observações contratuais</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2 md:max-w-sm">
                    <Label htmlFor="valorMensalidade">Valor Mensalidade</Label>
                    <Input
                      id="valorMensalidade"
                      placeholder="R$ 0,00"
                      value={planData.valorMensalidade}
                      onChange={handleValorChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite números apenas (ex.: 29781 → R$ 297,81)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      placeholder="Notas internas, condições específicas, reajuste, carência, etc."
                      rows={4}
                      value={planData.observacoes}
                      onChange={handleInputChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Ações (como no Clients: alinhadas à esquerda, sem sticky, sem centralizar) */}
              <div className="flex gap-2">
                <Button asChild variant="ghost">
                  <Link href={`/health/${clienteId}`}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={!isValid || submitting}>
                  {submitting ? "Salvando..." : "Salvar plano"}
                </Button>
              </div>
            </form>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
