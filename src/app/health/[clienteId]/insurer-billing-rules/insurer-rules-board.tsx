'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

// UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';

import { ReloadIcon, Pencil1Icon, TrashIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';

/* ============================================================
   Tipos flexíveis (adaptam-se a variações do seu backend)
============================================================ */
type AnyObj = Record<string, any>;

type InsurerOption = { id: string; name: string };

type Rule = {
  id: string;
  plan?: string;
  regime?: string;
  faixaMin?: number | null;
  faixaMax?: number | null;
  startDate?: string | null; // ISO
  endDate?: string | null;   // ISO
  active?: boolean;
  policy?: any;
  // reserva: payload bruto para edição
  _raw?: AnyObj;
};

/* ============================================================
   Helpers para mapear seguradoras e regras
============================================================ */
function getInsurerId(x: AnyObj): string | undefined {
  return (
    x?.id ??
    x?.insurerId ??
    x?.uuid ??
    x?.codigo ??
    x?.codigoSeguradora ??
    x?.code ??
    x?.slug ??
    undefined
  )?.toString();
}
function getInsurerName(x: AnyObj): string | undefined {
  const candidates = [
    x?.name, x?.nome, x?.fantasyName, x?.fantasia,
    x?.legalName, x?.razaoSocial, x?.label, x?.title,
  ];
  const n = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return n?.toString().trim();
}
function normalizeInsurers(payload: any): InsurerOption[] {
  const list: AnyObj[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.data)  ? payload.data
    : [];
  const out: InsurerOption[] = [];
  const seen = new Set<string>();
  for (const it of list) {
    const id = getInsurerId(it);
    if (!id) continue;
    const name = getInsurerName(it) ?? id;
    if (!seen.has(id)) {
      seen.add(id);
      out.push({ id, name });
    }
  }
  return out;
}

function normNumber(n: any): number | null {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

function normBool(b: any): boolean | undefined {
  if (typeof b === 'boolean') return b;
  if (b === 1 || b === '1' || b === 'true') return true;
  if (b === 0 || b === '0' || b === 'false') return false;
  return undefined;
}

function normDate(d: any): string | null {
  if (!d) return null;
  // aceita 'YYYY-MM' e transforma em início do mês
  if (/^\d{4}-\d{2}$/.test(String(d))) return `${d}-01`;
  const iso = new Date(d);
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString();
}

function normalizeRule(x: AnyObj): Rule {
  const plan = x?.plan ?? x?.planName ?? x?.plano ?? x?.planoNome ?? undefined;
  const regime = x?.regime ?? x?.billingRegime ?? x?.tipoRegime ?? undefined;

  const faixaMin = normNumber(x?.faixaMin ?? x?.minAge ?? x?.idadeMin);
  const faixaMax = normNumber(x?.faixaMax ?? x?.maxAge ?? x?.idadeMax);

  const active = normBool(x?.active ?? x?.enabled ?? x?.ativo) ?? false;

  const startDate = x?.startDate ?? x?.vigenciaInicial ?? x?.effectiveFrom ?? null;
  const endDate   = x?.endDate   ?? x?.vigenciaFinal  ?? x?.effectiveTo   ?? null;

  const policy    = x?.policy ?? x?.politica ?? x?.rules ?? undefined;

  return {
    id: String(x?.id ?? x?.uuid),
    plan,
    regime,
    faixaMin,
    faixaMax,
    startDate: normDate(startDate),
    endDate: normDate(endDate),
    active,
    policy,
    _raw: x,
  };
}

function normalizeRules(payload: any): Rule[] {
  const list: AnyObj[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items) ? payload.items
    : Array.isArray(payload?.data)  ? payload.data
    : [];
  return list
    .map((r) => {
      const id = r?.id ?? r?.uuid;
      if (!id) return null;
      return normalizeRule(r);
    })
    .filter((x): x is Rule => !!x);
}

const toYMD = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : '';

/* ============================================================
   Formulário (Create/Edit) — controlado, com JSON validado
============================================================ */
type RuleFormValues = {
  plan: string;
  regime: string;
  faixaMin?: number | '';
  faixaMax?: number | '';
  startDate?: string;
  endDate?: string;
  active: boolean;
  policyText: string; // JSON texto
};

function ruleToForm(r?: Rule): RuleFormValues {
  return {
    plan: r?.plan ?? '',
    regime: r?.regime ?? '',
    faixaMin: r?.faixaMin ?? '',
    faixaMax: r?.faixaMax ?? '',
    startDate: toYMD(r?.startDate),
    endDate: toYMD(r?.endDate),
    active: !!r?.active,
    policyText: r?.policy ? JSON.stringify(r.policy, null, 2) : '{\n  \n}',
  };
}

function parsePolicy(text: string): any {
  if (!text || !text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return '__INVALID_JSON__';
  }
}

/* ============================================================
   Componente principal
============================================================ */
export default function InsurerRulesBoard() {
  const { clienteId } = useParams<{ clienteId: string }>();

  const [insurerId, setInsurerId] = React.useState<string | undefined>(undefined);
  const [planFilter, setPlanFilter] = React.useState<string | undefined>(undefined);
  const [search, setSearch] = React.useState('');

  // Modal state
  const [openCreate, setOpenCreate] = React.useState(false);
  const [openEdit, setOpenEdit] = React.useState<null | string>(null); // id da regra em edição
  const [form, setForm] = React.useState<RuleFormValues>(ruleToForm());

  /* --------- Queries --------- */
  const insurersQ = useQuery({
    queryKey: ['insurers.list'],
    queryFn: async () => {
      try {
        const a = await apiFetch<any>('/insurers', { query: { line: 'HEALTH', active: true } });
        const norm = normalizeInsurers(a);
        if (norm.length) return norm;
      } catch {}
      try {
        const b = await apiFetch<any>('/insurers');
        return normalizeInsurers(b);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const rulesQ = useQuery({
    queryKey: ['client.rules', clienteId, insurerId, planFilter, search],
    enabled: !!insurerId,
    queryFn: async () => {
      const r = await apiFetch<any>(`/clients/${clienteId}/insurer-billing-rules`, {
        query: {
          insurerId,
          plan: planFilter,
          q: search || undefined,
        },
      });
      return normalizeRules(r);
    },
  });

  const insurers = insurersQ.data ?? [];
  const loadingInsurers = insurersQ.isLoading;

  /* --------- Mutations --------- */
  const createMt = useMutation({
    mutationFn: async () => {
      const policy = parsePolicy(form.policyText);
      if (policy === '__INVALID_JSON__') {
        throw new Error('JSON de política inválido.');
      }
      const body: AnyObj = {
        clientId: clienteId,
        insurerId,
        plan: form.plan || undefined,
        regime: form.regime || undefined,
        faixaMin: form.faixaMin === '' ? undefined : Number(form.faixaMin),
        faixaMax: form.faixaMax === '' ? undefined : Number(form.faixaMax),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        active: form.active,
        policy: policy,
      };
      return apiFetch('/insurer-billing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    },
    onSuccess: () => {
      toast.success('Regra criada.');
      setOpenCreate(false);
      rulesQ.refetch();
    },
    onError: (e: any) => toast.error('Falha ao criar regra', { description: String(e?.message || e) }),
  });

  const updateMt = useMutation({
    mutationFn: async (ruleId: string) => {
      const policy = parsePolicy(form.policyText);
      if (policy === '__INVALID_JSON__') {
        throw new Error('JSON de política inválido.');
      }
      const body: AnyObj = {
        plan: form.plan || undefined,
        regime: form.regime || undefined,
        faixaMin: form.faixaMin === '' ? undefined : Number(form.faixaMin),
        faixaMax: form.faixaMax === '' ? undefined : Number(form.faixaMax),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        active: form.active,
        policy: policy,
      };
      return apiFetch(`/insurer-billing-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    },
    onSuccess: () => {
      toast.success('Regra atualizada.');
      setOpenEdit(null);
      rulesQ.refetch();
    },
    onError: (e: any) => toast.error('Falha ao atualizar regra', { description: String(e?.message || e) }),
  });

  const toggleMt = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiFetch(`/insurer-billing-rules/${ruleId}/toggle-active`, { method: 'PATCH' });
    },
    onSuccess: () => {
      rulesQ.refetch();
    },
    onError: () => toast.error('Falha ao alternar ativo/inativo'),
  });

  const deleteMt = useMutation({
    mutationFn: async (ruleId: string) => {
      return apiFetch(`/insurer-billing-rules/${ruleId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      toast.success('Regra excluída.');
      rulesQ.refetch();
    },
    onError: () => toast.error('Falha ao excluir regra'),
  });

  /* --------- UI helpers --------- */
  const openCreateDialog = () => {
    if (!insurerId) {
      toast.message('Selecione uma seguradora antes de criar regra.');
      return;
    }
    setForm(ruleToForm());
    setOpenCreate(true);
  };

  const openEditDialog = (r: Rule) => {
    setForm(ruleToForm(r));
    setOpenEdit(r.id);
  };

  const insurerName = React.useMemo(() => {
    const found = insurers.find((i) => i.id === insurerId);
    return found?.name ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insurerId, insurersQ.data]);

  return (
    <div className="space-y-4">
      {/* Filtros & ações */}
      <Card>
        <CardHeader>
          <CardTitle>Seguradora & Regras de Faturamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Associe políticas por seguradora, plano, faixa etária e regime para o cliente <b>{clienteId}</b>.
          </p>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs">Seguradora</Label>
              {loadingInsurers ? (
                <Skeleton className="h-9 w-[240px]" />
              ) : (
                <Select value={insurerId} onValueChange={(v) => setInsurerId(v || undefined)}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {insurers.length ? (
                      insurers.map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__no__" disabled>Nenhuma seguradora</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Plano (filtro)</Label>
              <Input
                placeholder="Todos"
                value={planFilter ?? ''}
                onChange={(e) => setPlanFilter(e.target.value || undefined)}
                className="w-[220px]"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs">Buscar</Label>
              <Input
                placeholder="Plano, faixa, regime, datas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" onClick={() => insurersQ.refetch()} disabled={loadingInsurers}>
              {loadingInsurers ? <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> : null}
              Recarregar
            </Button>

            <Button onClick={openCreateDialog} disabled={!insurerId}>
              Nova Regra
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de regras */}
      <Card>
        <CardContent className="pt-6">
          {!insurerId ? (
            <div className="text-sm text-muted-foreground">
              Selecione uma seguradora para listar as regras deste cliente.
            </div>
          ) : rulesQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ReloadIcon className="h-4 w-4 animate-spin" />
              Carregando regras…
            </div>
          ) : (rulesQ.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma regra encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Regime</TableHead>
                    <TableHead>Faixa etária</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rulesQ.data ?? []).map((r) => {
                    const faixa =
                      r.faixaMin != null || r.faixaMax != null
                        ? `${r.faixaMin ?? '—'} ~ ${r.faixaMax ?? '—'}`
                        : '—';
                    const vig = `${r.startDate ? toYMD(r.startDate) : '—'}  →  ${r.endDate ? toYMD(r.endDate) : '—'}`;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{r.plan ?? '—'}</TableCell>
                        <TableCell>{r.regime ?? '—'}</TableCell>
                        <TableCell>{faixa}</TableCell>
                        <TableCell>{vig}</TableCell>
                        <TableCell>
                          {r.active ? (
                            <Badge variant="default">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="outline" onClick={() => openEditDialog(r)} title="Editar">
                            <Pencil1Icon />
                          </Button>
                          <Button
                            size="icon"
                            variant={r.active ? 'secondary' : 'outline'}
                            onClick={() => toggleMt.mutate(r.id)}
                            title={r.active ? 'Desativar' : 'Ativar'}
                          >
                            {r.active ? <Cross2Icon /> : <CheckIcon />}
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Excluir esta regra?')) deleteMt.mutate(r.id);
                            }}
                            title="Excluir"
                          >
                            <TrashIcon />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogo: Nova Regra */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Regra</DialogTitle>
            <DialogDescription>
              Seguradora: <b>{insurerName || '—'}</b>
            </DialogDescription>
          </DialogHeader>

          <RuleForm form={form} onChange={setForm} />

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMt.mutate()} disabled={createMt.isPending}>
              {createMt.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogo: Editar Regra */}
      <Dialog open={!!openEdit} onOpenChange={(o) => setOpenEdit(o ? openEdit : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Regra</DialogTitle>
          </DialogHeader>

          <RuleForm form={form} onChange={setForm} />

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenEdit(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => openEdit && updateMt.mutate(openEdit)}
              disabled={updateMt.isPending || !openEdit}
            >
              {updateMt.isPending ? 'Atualizando…' : 'Atualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   Subcomponente: RuleForm
============================================================ */
function RuleForm({
  form,
  onChange,
}: {
  form: RuleFormValues;
  onChange: React.Dispatch<React.SetStateAction<RuleFormValues>>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1">
          <Label>Plano</Label>
          <Input
            value={form.plan}
            onChange={(e) => onChange((f) => ({ ...f, plan: e.target.value }))}
            placeholder="Ex.: SMART 300 CE"
          />
        </div>

        <div className="grid gap-1">
          <Label>Regime</Label>
          <Input
            value={form.regime}
            onChange={(e) => onChange((f) => ({ ...f, regime: e.target.value }))}
            placeholder="Ex.: CE, ENF, AMB, HOSP"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Faixa mínima</Label>
            <Input
              type="number"
              value={form.faixaMin === '' ? '' : String(form.faixaMin)}
              onChange={(e) =>
                onChange((f) => ({ ...f, faixaMin: e.target.value === '' ? '' : Number(e.target.value) }))
              }
              placeholder="Ex.: 0"
            />
          </div>
          <div className="grid gap-1">
            <Label>Faixa máxima</Label>
            <Input
              type="number"
              value={form.faixaMax === '' ? '' : String(form.faixaMax)}
              onChange={(e) =>
                onChange((f) => ({ ...f, faixaMax: e.target.value === '' ? '' : Number(e.target.value) }))
              }
              placeholder="Ex.: 18"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Vigência (início)</Label>
            <Input
              type="date"
              value={form.startDate || ''}
              onChange={(e) => onChange((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="grid gap-1">
            <Label>Vigência (fim)</Label>
            <Input
              type="date"
              value={form.endDate || ''}
              onChange={(e) => onChange((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={form.active}
          onCheckedChange={(v) => onChange((f) => ({ ...f, active: !!v }))}
          id="rule-active"
        />
        <Label htmlFor="rule-active">Ativa</Label>
      </div>

      <div className="grid gap-1">
        <Label>Política (JSON)</Label>
        <Textarea
          value={form.policyText}
          onChange={(e) => onChange((f) => ({ ...f, policyText: e.target.value }))}
          rows={10}
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          Cole aqui a política em JSON. Ex.: {"{ \"coPart\": 30, \"teto\": 150 }"}
        </p>
      </div>
    </div>
  );
}
