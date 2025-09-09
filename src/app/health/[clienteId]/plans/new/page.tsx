"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";

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
import { CalendarIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export default function ClientPlansPage() {
  const { clienteId } = useParams<{ clienteId: string }>();
  const router = useRouter();

  // ======== STATE LISTA ========
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

  // ======== STATE DIALOG CADASTRO ========
  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    slug: string;
    name: string;
    dataVigencia: Date | null;
    valorMensalidade: string; // máscara BRL
    faixaEtaria?: string;
    observacoes?: string;
    regimeCobranca?: "MENSAL" | "DIARIO" | "";
  }>({
    slug: "",
    name: "",
    dataVigencia: null,
    valorMensalidade: "",
    faixaEtaria: "",
    observacoes: "",
    regimeCobranca: "MENSAL",
  });

  // Popover do calendário dentro do Dialog
  const [openCalendar, setOpenCalendar] = useState(false);

  // ======== HELPERS ========
  const formatCurrencyBRL = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, "");
    const asNumber = Number(onlyDigits) / 100;
    return asNumber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  const parseCurrencyToStringDecimal = (masked: string) => {
    const normalized = masked.replace(/\s|R\$/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? String(n) : "0";
  };
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
    const afterIni = today >= new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
    const beforeFim = !fim || today <= new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
    return afterIni && beforeFim;
  };
  const pickCurrentOrLatest = (prices: ClientPlanPrice[]) => {
    if (!prices || prices.length === 0) return undefined;
    const vigente = prices
      .filter(isVigenteHoje)
      .sort((a, b) => +new Date(b.vigenciaInicio) - +new Date(a.vigenciaInicio))[0];
    if (vigente) return { price: vigente, computedAs: "vigente" as const };
    const latest = [...prices].sort(
      (a, b) => +new Date(b.vigenciaInicio) - +new Date(a.vigenciaInicio)
    )[0];
    return latest ? { price: latest, computedAs: "fallback" as const } : undefined;
  };
  const isValid = useMemo(
    () =>
      form.slug.trim().length > 2 &&
      form.name.trim().length > 2 &&
      !!form.dataVigencia &&
      form.valorMensalidade.trim().length > 0,
    [form]
  );

  // ======== LOAD LISTA ========
  const loadList = async () => {
    setLoadingList(true);
    try {
      const linksResp = await apiFetch<ClientPlanLink[]>(`/clients/${clienteId}/plans`);
      setLinks(linksResp);

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

  // ======== HANDLERS DIALOG CADASTRO ========
  const onChangeField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };
  const onChangeValor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.trim() === "") {
      setForm((prev) => ({ ...prev, valorMensalidade: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, valorMensalidade: formatCurrencyBRL(val) }));
  };
  const onChangeRegime = (value: "MENSAL" | "DIARIO" | "") =>
    setForm((p) => ({ ...p, regimeCobranca: value }));
  const onChangeDate = (date: Date | undefined) =>
    setForm((p) => ({ ...p, dataVigencia: date ?? null }));

  const resetForm = () =>
    setForm({
      slug: "",
      name: "",
      dataVigencia: null,
      valorMensalidade: "",
      faixaEtaria: "",
      observacoes: "",
      regimeCobranca: "MENSAL",
    });

  const submitCreate = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const createdPlan = await apiFetch<{ id: string }>(`/health/plans`, {
        method: "POST",
        body: {
          slug: form.slug.trim(),
          name: form.name.trim(),
          isActive: true,
        },
      });
      await apiFetch(`/clients/${clienteId}/plans`, {
        method: "POST",
        body: { planId: createdPlan.id, isActive: true },
      });
      await apiFetch(`/clients/${clienteId}/plans/${createdPlan.id}/prices`, {
        method: "POST",
        body: {
          planId: createdPlan.id,
          vigenciaInicio: form.dataVigencia?.toISOString().slice(0, 10),
          faixaEtaria: form.faixaEtaria || undefined,
          valor: parseCurrencyToStringDecimal(form.valorMensalidade),
          regimeCobranca: form.regimeCobranca || undefined,
        },
      });

      toast.success("Plano criado e vinculado ao cliente com preço inicial.");
      setOpenCreate(false);
      resetForm();
      loadList();
    } catch (err: any) {
      toast.error("Falha ao cadastrar o plano.", {
        description: err?.message ?? String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ======== AÇÕES DA TABELA ========
  const goEdit = (planId: string) => router.push(`/health/plans/${planId}`);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/health/plans/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Plano excluído.");
      setDeleteTarget(null);
      loadList();
    } catch (err: any) {
      toast.error("Falha ao excluir.", { description: err?.message ?? String(err) });
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
          <div className="flex-1 p-4 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h1 className="text-xl font-semibold">Planos do cliente</h1>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href={`/health/${clienteId}`}>Voltar</Link>
                </Button>
                {/* TORNANDO O DIALOG NÃO-MODAL PARA PERMITIR CLIQUES NO POPOVER */}
                <Dialog open={openCreate} onOpenChange={setOpenCreate} modal={false}>
                  <DialogTrigger asChild>
                    <Button>Novo plano</Button>
                  </DialogTrigger>
                  <DialogContent
                    className="max-w-2xl"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <DialogHeader>
                      <DialogTitle>Novo plano</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-6">
                      {/* Identificação */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="slug">Slug</Label>
                          <Input
                            id="slug"
                            placeholder="ex.: unimed-nacional"
                            value={form.slug}
                            onChange={onChangeField}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nome do Plano</Label>
                          <Input
                            id="name"
                            placeholder="Ex.: Plano Ouro"
                            value={form.name}
                            onChange={onChangeField}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dataVigencia">Vigência</Label>
                          <Popover modal={false} open={openCalendar} onOpenChange={setOpenCalendar}>
                            <PopoverTrigger asChild>
                              <Button
                                id="dataVigencia"
                                type="button"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !form.dataVigencia && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {form.dataVigencia
                                  ? format(form.dataVigencia, "dd/MM/yyyy")
                                  : "Escolha uma data"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-50" align="start">
                              <Calendar
                                mode="single"
                                selected={form.dataVigencia ?? undefined}
                                onSelect={(date) => {
                                  onChangeDate(date);
                                  setOpenCalendar(false);
                                }}
                                defaultMonth={form.dataVigencia ?? new Date()}
                                disabled={undefined}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Financeiro */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="valorMensalidade">Valor Mensalidade</Label>
                          <Input
                            id="valorMensalidade"
                            placeholder="R$ 0,00"
                            value={form.valorMensalidade}
                            onChange={onChangeValor}
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
                            value={form.faixaEtaria || ""}
                            onChange={onChangeField}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Regime de Cobrança</Label>
                          <Select
                            value={form.regimeCobranca || ""}
                            onValueChange={(v: "MENSAL" | "DIARIO" | "") => onChangeRegime(v)}
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
                            rows={3}
                            value={form.observacoes}
                            onChange={onChangeField}
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter className="gap-2">
                      <Button variant="ghost" type="button" onClick={() => setOpenCreate(false)}>
                        Cancelar
                      </Button>
                      <Button type="button" onClick={submitCreate} disabled={!isValid || submitting}>
                        {submitting ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* LISTA */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Planos vinculados</CardTitle>
                <CardDescription>
                  Mostra o <b>preço vigente</b> hoje (ou último cadastrado).
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
                          <th className="px-3 py-2 text-right font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {links.map((link) => {
                          const lp = latestByPlan[link.planId];
                          const price = lp?.price;
                          return (
                            <tr key={`${link.planId}-${link.plan.slug}`} className="border-t">
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
                              <td className="px-3 py-2 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Ações">
                                      <DotsHorizontalIcon className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => goEdit(link.planId)}>
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600 focus:text-red-600"
                                      onClick={() =>
                                        setDeleteTarget({ id: link.plan.id, name: link.plan.name })
                                      }
                                    >
                                      Excluir…
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CONFIRMAÇÃO DE EXCLUSÃO */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente. O plano <b>{deleteTarget?.name ?? ""}</b> será removido.
                    Relações como aliases, preços e vínculos com clientes poderão ser afetadas.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                    Confirmar exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
