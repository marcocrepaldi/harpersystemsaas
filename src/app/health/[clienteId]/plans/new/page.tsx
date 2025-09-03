"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

import { Protected } from "@/components/auth/protected";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

type ClientPlanLink = {
  clientId: string;
  planId: string;
  isActive: boolean;
  plan: { id: string; slug: string; name: string; isActive: boolean };
};

type ClientPlanPrice = {
  id: string;
  clientId: string;
  planId: string;
  vigenciaInicio: string; // ISO
  vigenciaFim?: string | null; // ISO
  faixaEtaria?: string | null;
  valor: string; // decimal string
  regimeCobranca?: "MENSAL" | "DIARIO" | null;
};

const tiposDePlano = [
  "COLETIVO_POR_ADESAO",
  "COLETIVO_EMPRESARIAL",
  "INDIVIDUAL_FAMILIAR",
] as const;
type TipoPlano = (typeof tiposDePlano)[number];

export default function NewPlanPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();

  const [planData, setPlanData] = useState<{
    slug: string;
    name: string;
    tipo: TipoPlano | "";
    dataVigencia: Date | null;
    codigoAns: string;
    valorMensalidade: string; // máscara BRL
    observacoes?: string;
    faixaEtaria?: string;
    regimeCobranca?: "MENSAL" | "DIARIO" | "";
  }>({
    slug: "",
    name: "",
    tipo: "",
    dataVigencia: null,
    codigoAns: "",
    valorMensalidade: "",
    observacoes: "",
    faixaEtaria: "",
    regimeCobranca: "MENSAL",
  });

  const [submitting, setSubmitting] = useState(false);

  // ======== STATE DA LISTA (VIEW) ========
  const [loadingList, setLoadingList] = useState(false);
  const [links, setLinks] = useState<ClientPlanLink[]>([]);
  const [latestByPlan, setLatestByPlan] = useState<
    Record<
      string,
      {
        price?: ClientPlanPrice;
        brl?: string;
        computedAs?: "vigente" | "fallback";
      }
    >
  >({});

  // ======== HELPERS ========
  const formatCurrencyBRL = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "");
    const asNumber = Number(onlyDigits) / 100;
    return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const parseCurrencyToStringDecimal = (masked: string) => {
    // retorna string compatível com Decimal Prisma (ex.: "1234.56")
    const normalized = masked.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? String(n) : "0";
  };

  const isValid = useMemo(
    () =>
      planData.slug.trim().length > 2 &&
      planData.name.trim().length > 2 &&
      !!planData.dataVigencia &&
      planData.valorMensalidade.trim().length > 0,
    [planData]
  );

  const brl = (s?: string) => {
    if (!s) return "—";
    const n = Number(String(s).replace(",", "."));
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isVigenteHoje = (p: ClientPlanPrice) => {
    const today = new Date();
    const ini = new Date(p.vigenciaInicio);
    const fim = p.vigenciaFim ? new Date(p.vigenciaFim) : null;
    const afterIni =
      today >= new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
    const beforeFim = !fim || today <= new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
    return afterIni && beforeFim;
  };

  const pickCurrentOrLatest = (prices: ClientPlanPrice[]) => {
    if (!prices || prices.length === 0) return undefined;
    // 1) tente vigente hoje
    const vigente = prices
      .filter(isVigenteHoje)
      .sort((a, b) => +new Date(b.vigenciaInicio) - +new Date(a.vigenciaInicio))[0];
    if (vigente) return { price: vigente, computedAs: "vigente" as const };

    // 2) fallback: o mais recente por vigenciaInicio
    const latest = [...prices].sort(
      (a, b) => +new Date(b.vigenciaInicio) - +new Date(a.vigenciaInicio)
    )[0];
    return latest ? { price: latest, computedAs: "fallback" as const } : undefined;
  };

  // ======== LOAD LISTA ========
  const loadList = async () => {
    setLoadingList(true);
    try {
      // 1) vínculos do cliente
      const linksResp = await apiFetch<ClientPlanLink[]>(`/clients/${clienteId}/plans`);
      setLinks(linksResp);

      // 2) busca preços por plano em paralelo
      const entries = await Promise.all(
        linksResp.map(async (link) => {
          const prices = await apiFetch<ClientPlanPrice[]>(
            `/clients/${clienteId}/plans/${link.planId}/prices`
          );
          const picked = pickCurrentOrLatest(prices);
          return [
            link.planId,
            picked
              ? {
                  price: picked.price,
                  brl: brl(picked.price?.valor),
                  computedAs: picked.computedAs,
                }
              : { price: undefined, brl: undefined, computedAs: undefined },
          ] as const;
        })
      );

      const map: typeof latestByPlan = {};
      entries.forEach(([planId, v]) => (map[planId] = v));
      setLatestByPlan(map);
    } catch (err: any) {
      toast.error("Falha ao carregar planos do cliente.", {
        description: err?.message ?? String(err),
      });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  // ======== HANDLERS FORM ========
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

  const handleSelectChange = (field: "tipo" | "regimeCobranca") => (value: any) => {
    setPlanData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setPlanData((prev) => ({ ...prev, dataVigencia: date ?? null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      // 1) Cria o plano global
      const createdPlan = await apiFetch<{ id: string }>(`/health/plans`, {
        method: "POST",
        body: {
          slug: planData.slug.trim(),
          name: planData.name.trim(),
          isActive: true,
        },
      });

      // 2) Vincula o plano ao cliente
      await apiFetch(`/clients/${clienteId}/plans`, {
        method: "POST",
        body: { planId: createdPlan.id, isActive: true },
      });

      // 3) Cadastra preço do plano para o cliente (vigência + valor + faixa/regime opcionais)
      await apiFetch(`/clients/${clienteId}/plans/${createdPlan.id}/prices`, {
        method: "POST",
        body: {
          planId: createdPlan.id,
          vigenciaInicio: planData.dataVigencia?.toISOString().slice(0, 10),
          faixaEtaria: planData.faixaEtaria || undefined,
          valor: parseCurrencyToStringDecimal(planData.valorMensalidade),
          regimeCobranca: planData.regimeCobranca || undefined,
        },
      });

      toast.success("Plano criado e vinculado ao cliente com preço inicial.");
      // limpa formulário rápido
      setPlanData((p) => ({
        ...p,
        slug: "",
        name: "",
        dataVigencia: null,
        valorMensalidade: "",
        faixaEtaria: "",
        observacoes: "",
      }));
      // Recarrega a lista
      loadList();
    } catch (err: any) {
      toast.error("Falha ao cadastrar o plano.", {
        description: err?.message ?? String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ======== RENDER ========
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
          <div className="flex-1 p-4 md:p-6">
            <h1 className="mb-4 text-xl font-semibold">Cadastro de Plano</h1>

            {/* ====== FORM ====== */}
            <form onSubmit={handleSubmit} className="grid gap-6 max-w-3xl">
              {/* Identificação */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Identificação do plano</CardTitle>
                  <CardDescription>Dados principais do produto contratado</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      placeholder="ex.: unimed-nacional"
                      value={planData.slug}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do Plano</Label>
                    <Input
                      id="name"
                      placeholder="Ex.: Plano Ouro"
                      value={planData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="codigoAns">Código ANS (opcional)</Label>
                    <Input
                      id="codigoAns"
                      inputMode="numeric"
                      placeholder="Ex.: 123456"
                      value={planData.codigoAns}
                      onChange={handleInputChange}
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
                  <CardDescription>Valores e observações</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="valorMensalidade">Valor Mensalidade</Label>
                    <Input
                      id="valorMensalidade"
                      placeholder="R$ 0,00"
                      value={planData.valorMensalidade}
                      onChange={handleValorChange}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite números apenas (ex.: 29781 → R$ 297,81)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="faixaEtaria">Faixa Etária (opcional)</Label>
                    <Input
                      id="faixaEtaria"
                      placeholder='Ex.: "29-33" ou "59+"'
                      value={planData.faixaEtaria || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Regime de Cobrança</Label>
                    <Select
                      value={planData.regimeCobranca || ""}
                      onValueChange={handleSelectChange("regimeCobranca")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MENSAL">Mensal</SelectItem>
                        <SelectItem value="DIARIO">Diário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 md:col-span-2">
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

              {/* Ações */}
              <div className="flex gap-2">
                <Button asChild variant="ghost">
                  <Link href={`/health/${clienteId}`}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={!isValid || submitting}>
                  {submitting ? "Salvando..." : "Salvar plano"}
                </Button>
              </div>
            </form>

            {/* ====== LISTA DE PLANOS DO CLIENTE ====== */}
            <div className="mt-10">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Planos do cliente</CardTitle>
                  <CardDescription>
                    Exibe o <b>preço atual</b> (vigente hoje) por plano. Se não houver um vigente, mostra o último preço cadastrado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingList ? (
                    <div className="text-sm text-muted-foreground">Carregando…</div>
                  ) : links.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nenhum plano vinculado.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Plano</th>
                            <th className="px-3 py-2 text-left font-medium">Slug</th>
                            <th className="px-3 py-2 text-left font-medium">Valor atual</th>
                            <th className="px-3 py-2 text-left font-medium">Faixa</th>
                            <th className="px-3 py-2 text-left font-medium">Vigência início</th>
                            <th className="px-3 py-2 text-left font-medium">Regime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {links.map((link) => {
                            const lp = latestByPlan[link.planId];
                            const price = lp?.price;
                            return (
                              <tr key={`${link.planId}-${link.plan.slug}`}>
                                <td className="px-3 py-2">{link.plan.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{link.plan.slug}</td>
                                <td className="px-3 py-2">{lp?.brl ?? "—"}</td>
                                <td className="px-3 py-2">{price?.faixaEtaria ?? "—"}</td>
                                <td className="px-3 py-2">
                                  {price?.vigenciaInicio
                                    ? format(new Date(price.vigenciaInicio), "dd/MM/yyyy")
                                    : "—"}
                                </td>
                                <td className="px-3 py-2">{price?.regimeCobranca ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
