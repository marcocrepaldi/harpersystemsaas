"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";

/** ================= BACKEND TYPES (inalterados) ================= */
type BeneficiaryPayload = {
  nomeCompleto: string;
  cpf?: string | null;
  tipo: "TITULAR" | "FILHO" | "CONJUGE";
  dataEntrada: string;
  dataNascimento?: string | null;
  valorMensalidade?: string | null;
  titularId?: string | null;
  matricula?: string | null;
  carteirinha?: string | null;
  sexo?: "M" | "F" | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;
  estado?: string | null; // UF
  contrato?: string | null;
  comentario?: string | null;
  status?: "ATIVO" | "INATIVO";
  dataSaida?: string | null;
  regimeCobranca?: "MENSAL" | "DIARIO" | null;
  motivoMovimento?: "INCLUSAO" | "EXCLUSAO" | "ALTERACAO" | "NENHUM" | null;
  observacoes?: string | null;
};

type Props = {
  mode: "create" | "edit";
  clienteId: string;
  beneficiaryId?: string;
  initialValues?: Partial<BeneficiaryPayload>;
  onSuccessRedirect: string;
};

type TitularOption = { id: string; nomeCompleto: string };

/** ================= Metadados dos campos base + CSV tag ================= */
type FieldMeta = { label: string; csv?: string };
const FIELD_META: Record<keyof BeneficiaryPayload, FieldMeta> = {
  nomeCompleto: { label: "Nome Completo", csv: "Usuario" },
  cpf: { label: "CPF", csv: "Cpf" },
  tipo: { label: "Tipo de Vínculo" },
  dataEntrada: { label: "Data de Entrada (Vigência)", csv: "Dt_Admissao" },
  dataNascimento: { label: "Data de Nascimento", csv: "Data_Nascimento" },
  valorMensalidade: { label: "Mensalidade (R$)" },
  titularId: { label: "Vincular ao Titular" },
  matricula: { label: "Matrícula", csv: "Matricula" },
  carteirinha: { label: "Carteirinha" },
  sexo: { label: "Sexo", csv: "Sexo" },
  plano: { label: "Plano", csv: "Plano" },
  centroCusto: { label: "Centro de Custo" },
  faixaEtaria: { label: "Faixa Etária" },
  estado: { label: "Estado (UF)", csv: "Uf_Endereco" },
  contrato: { label: "Contrato" },
  comentario: { label: "Observação / Ação" },
  status: { label: "Status" },
  dataSaida: { label: "Data de Saída", csv: "Dt_Cancelamento" },
  regimeCobranca: { label: "Regime de Cobrança" },
  motivoMovimento: { label: "Motivo do Movimento" },
  observacoes: { label: "Observações (internas)" },
};

function LabelWithCsv({ htmlFor, meta, required }: { htmlFor: string; meta: FieldMeta; required?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{meta.label} {required ? "*" : null}</Label>
      {meta.csv ? (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CSV: {meta.csv}</span>
      ) : null}
    </div>
  );
}

/** ================= Campos CSV extras (todos os que você listou) =================
 * Serão exibidos em "Dados da Operadora (CSV)" e enviados compactados em `observacoes` (JSON).
 */
type CsvExtraKey =
  | "Empresa" | "Cpf" | "Usuario" | "Nm_Social" | "Estado_Civil" | "Data_Nascimento" | "Sexo"
  | "Identidade" | "Orgao_Exp" | "Uf_Orgao" | "Uf_Endereco" | "Cidade" | "Tipo_Logradouro"
  | "Logradouro" | "Numero" | "Complemento" | "Bairro" | "Cep" | "Fone" | "Celular" | "Plano"
  | "Matricula" | "Filial" | "Codigo_Usuario" | "Dt_Admissao" | "Codigo_Congenere" | "Nm_Congenere"
  | "Tipo_Usuario" | "Nome_Mae" | "Pis" | "Cns" | "Ctps" | "Serie_Ctps" | "Data_Processamento"
  | "Data_Cadastro" | "Unidade" | "Descricao_Unidade" | "Cpf_Dependente" | "Grau_Parentesco"
  | "Dt_Casamento" | "Nu_Registro_Pessoa_Natural" | "Cd_Tabela" | "Empresa_Utilizacao" | "Dt_Cancelamento";

const CSV_EXTRAS: Array<{ key: CsvExtraKey; label: string; type?: "text" | "date" | "tel" | "number" }> = [
  { key: "Empresa", label: "Empresa" },
  { key: "Cpf", label: "CPF" },
  { key: "Usuario", label: "Nome (Operadora)" },
  { key: "Nm_Social", label: "Nome Social" },
  { key: "Estado_Civil", label: "Estado Civil" },
  { key: "Data_Nascimento", label: "Data de Nascimento", type: "date" },
  { key: "Sexo", label: "Sexo" },
  { key: "Identidade", label: "RG / Identidade" },
  { key: "Orgao_Exp", label: "Órgão Expedidor" },
  { key: "Uf_Orgao", label: "UF do Órgão" },
  { key: "Uf_Endereco", label: "UF do Endereço" },
  { key: "Cidade", label: "Cidade" },
  { key: "Tipo_Logradouro", label: "Tipo de Logradouro" },
  { key: "Logradouro", label: "Logradouro" },
  { key: "Numero", label: "Número" },
  { key: "Complemento", label: "Complemento" },
  { key: "Bairro", label: "Bairro" },
  { key: "Cep", label: "CEP", type: "tel" },
  { key: "Fone", label: "Telefone", type: "tel" },
  { key: "Celular", label: "Celular", type: "tel" },
  { key: "Plano", label: "Plano" },
  { key: "Matricula", label: "Matrícula" },
  { key: "Filial", label: "Filial" },
  { key: "Codigo_Usuario", label: "Código do Usuário" },
  { key: "Dt_Admissao", label: "Data de Admissão", type: "date" },
  { key: "Codigo_Congenere", label: "Código Congênere" },
  { key: "Nm_Congenere", label: "Nome da Congênere" },
  { key: "Tipo_Usuario", label: "Tipo de Usuário" },
  { key: "Nome_Mae", label: "Nome da Mãe" },
  { key: "Pis", label: "PIS" },
  { key: "Cns", label: "CNS" },
  { key: "Ctps", label: "CTPS" },
  { key: "Serie_Ctps", label: "Série CTPS" },
  { key: "Data_Processamento", label: "Data de Processamento", type: "date" },
  { key: "Data_Cadastro", label: "Data de Cadastro", type: "date" },
  { key: "Unidade", label: "Unidade" },
  { key: "Descricao_Unidade", label: "Descrição da Unidade" },
  { key: "Cpf_Dependente", label: "CPF do Dependente" },
  { key: "Grau_Parentesco", label: "Grau de Parentesco" },
  { key: "Dt_Casamento", label: "Data de Casamento", type: "date" },
  { key: "Nu_Registro_Pessoa_Natural", label: "Nº Registro Pessoa Natural" },
  { key: "Cd_Tabela", label: "Código Tabela" },
  { key: "Empresa_Utilizacao", label: "Empresa de Utilização" },
  { key: "Dt_Cancelamento", label: "Data de Cancelamento", type: "date" },
];

/** State adicional só no FRONT: armazena os extras */
type CsvExtrasState = Partial<Record<CsvExtraKey, string>>;

/** ================= Helpers ================= */
const EDITABLE_KEYS: (keyof BeneficiaryPayload)[] = [
  "nomeCompleto","cpf","tipo","dataEntrada","dataNascimento","valorMensalidade","titularId",
  "matricula","carteirinha","sexo","plano","centroCusto","faixaEtaria","estado","contrato",
  "comentario","status","dataSaida","regimeCobranca","motivoMovimento","observacoes",
];

const trim = (v: any) => (typeof v === "string" ? v.trim() : v);
const onlyDigits = (v?: string | null) => (v ? v.replace(/\D/g, "") : v);
const toYyyyMmDd = (v?: string | null) => (v ? String(v).slice(0, 10) : v);

function normalizeForForm(iv: Partial<BeneficiaryPayload> | any): Partial<BeneficiaryPayload> {
  const out: Partial<BeneficiaryPayload> = {};
  out.nomeCompleto = trim(iv?.nomeCompleto ?? "");
  out.cpf = onlyDigits(iv?.cpf ?? "") || "";
  out.tipo = iv?.tipo ?? undefined;
  out.dataEntrada = toYyyyMmDd(iv?.dataEntrada ?? "") || "";
  out.dataNascimento = toYyyyMmDd(iv?.dataNascimento ?? "") || "";
  out.valorMensalidade = iv?.valorMensalidade ?? "";
  out.titularId = iv?.titularId ?? undefined;
  out.matricula = trim(iv?.matricula ?? "");
  out.carteirinha = trim(iv?.carteirinha ?? "");
  out.sexo = iv?.sexo ?? undefined;
  out.plano = trim(iv?.plano ?? "");
  out.centroCusto = trim(iv?.centroCusto ?? "");
  out.faixaEtaria = trim(iv?.faixaEtaria ?? "");
  out.estado = trim(iv?.estado ?? "");
  out.contrato = trim(iv?.contrato ?? "");
  out.comentario = trim(iv?.comentario ?? "");
  out.status = iv?.status ?? undefined;
  out.dataSaida = toYyyyMmDd(iv?.dataSaida ?? "") || "";
  out.regimeCobranca = iv?.regimeCobranca ?? undefined;
  out.motivoMovimento = iv?.motivoMovimento ?? undefined;
  out.observacoes = trim(iv?.observacoes ?? "");
  return out;
}

/** Concatena os extras CSV em `observacoes` como JSON */
function mergeObservacoesWithCsvExtras(original: string | undefined | null, extras: CsvExtrasState): string {
  // remove chaves vazias
  const filled: Record<string, string> = {};
  for (const k of Object.keys(extras) as CsvExtraKey[]) {
    const v = (extras as any)[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      filled[k] = String(v).trim();
    }
  }
  if (Object.keys(filled).length === 0) return original ?? "";
  const payload = { csvExtras: filled };
  const prefix = (original && original.trim().length > 0) ? `${original}\n` : "";
  return `${prefix}${JSON.stringify(payload)}`;
}

/** ================= Componente ================= */
export default function BeneficiaryForm({ mode, clienteId, beneficiaryId, initialValues, onSuccessRedirect }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const [formData, setFormData] = React.useState<Partial<BeneficiaryPayload>>(
    initialValues ? normalizeForForm(initialValues) : {}
  );
  const [csvExtras, setCsvExtras] = React.useState<CsvExtrasState>({});

  React.useEffect(() => {
    if (mode === "edit" && initialValues) {
      setFormData(normalizeForForm(initialValues));
      // opcional: se quiser parsear JSON anterior de observacoes, podemos tentar aqui
      try {
        const maybe = initialValues?.observacoes && JSON.parse(initialValues.observacoes);
        if (maybe?.csvExtras && typeof maybe.csvExtras === "object") {
          setCsvExtras(maybe.csvExtras as CsvExtrasState);
        }
      } catch { /* ignore */ }
    }
  }, [mode, initialValues]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let v: any = value;
    if (name === "cpf") v = onlyDigits(value);
    if (name === "valorMensalidade") v = value;
    if (type === "date") v = value;
    setFormData((prev) => ({ ...prev, [name]: v }));
  };

  const handleSelectChange = (name: keyof BeneficiaryPayload, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value as any };
      if (name === "tipo") next.titularId = value === "TITULAR" ? undefined : prev.titularId ?? undefined;
      if (name === "status" && value === "INATIVO" && !prev.dataSaida)
        next.dataSaida = new Date().toISOString().slice(0, 10);
      return next;
    });
  };

  // CSV extras change
  const handleCsvExtraChange = (key: CsvExtraKey, value: string) => {
    setCsvExtras((prev) => ({ ...prev, [key]: value }));
    // espelhamento opcional para campos principais
    if (key === "Usuario") setFormData((p) => ({ ...p, nomeCompleto: p.nomeCompleto || value }));
    if (key === "Cpf") setFormData((p) => ({ ...p, cpf: onlyDigits(value) ?? "" }));
    if (key === "Data_Nascimento") setFormData((p) => ({ ...p, dataNascimento: value.slice(0, 10) }));
    if (key === "Sexo") setFormData((p) => ({ ...p, sexo: (value?.toUpperCase() === "M" || value?.toUpperCase() === "F") ? (value?.toUpperCase() as "M" | "F") : p.sexo }));
    if (key === "Dt_Admissao") setFormData((p) => ({ ...p, dataEntrada: p.dataEntrada || value.slice(0, 10) }));
    if (key === "Plano") setFormData((p) => ({ ...p, plano: p.plano || value }));
    if (key === "Matricula") setFormData((p) => ({ ...p, matricula: p.matricula || value }));
    if (key === "Uf_Endereco") setFormData((p) => ({ ...p, estado: p.estado || value }));
  };

  // Carregar titulares quando necessário
  const { data: titulares, isLoading: isLoadingTitulares } = useQuery<TitularOption[]>({
    queryKey: ["beneficiaries", { clienteId, tipo: "TITULAR" }],
    queryFn: () =>
      apiFetch(`/clients/${clienteId}/beneficiaries`, { query: { tipo: "TITULAR" } }).then(
        (res: any) => res.items as TitularOption[]
      ),
    enabled: formData.tipo !== "TITULAR" && !!clienteId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<BeneficiaryPayload>) => {
      const url =
        mode === "create"
          ? `/clients/${clienteId}/beneficiaries`
          : `/clients/${clienteId}/beneficiaries/${beneficiaryId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      return apiFetch(url, { method, body: payload });
    },
    onSuccess: () => {
      toast.success(`Beneficiário ${mode === "create" ? "criado" : "atualizado"} com sucesso!`);
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error("Falha ao salvar.", { description: errorMessage(e) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!beneficiaryId) throw new Error("ID do beneficiário não informado.");
      return apiFetch(`/clients/${clienteId}/beneficiaries/${beneficiaryId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast.success("Beneficiário excluído com sucesso.");
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error("Falha ao excluir.", { description: errorMessage(e) }),
  });

  const buildPayload = (fd: Partial<BeneficiaryPayload>): Partial<BeneficiaryPayload> => {
    const p: Partial<BeneficiaryPayload> = {};
    const EDITABLE_KEYS: (keyof BeneficiaryPayload)[] = [
      "nomeCompleto","cpf","tipo","dataEntrada","dataNascimento","valorMensalidade","titularId",
      "matricula","carteirinha","sexo","plano","centroCusto","faixaEtaria","estado","contrato",
      "comentario","status","dataSaida","regimeCobranca","motivoMovimento","observacoes",
    ];
    for (const k of EDITABLE_KEYS) {
      const v = (fd as any)[k];
      if (v === "" || v === undefined || v === null) continue;
      if (k === "cpf") p.cpf = onlyDigits(String(v)) ?? undefined;
      else if (k === "valorMensalidade") p.valorMensalidade = String(v).replace(",", ".");
      else if (k === "status") p.status = String(v).toUpperCase() as "ATIVO" | "INATIVO";
      else if (k === "regimeCobranca") p.regimeCobranca = String(v).toUpperCase() as "MENSAL" | "DIARIO";
      else if (k === "motivoMovimento")
        p.motivoMovimento = String(v).toUpperCase() as "INCLUSAO" | "EXCLUSAO" | "ALTERACAO" | "NENHUM";
      else if (k === "tipo") {
        const t = String(v).toUpperCase();
        p.tipo = (t === "TITULAR" || t === "FILHO" || t === "CONJUGE" ? (t as any) : "FILHO");
      } else (p as any)[k] = v;
    }
    // ➕ empacota extras em observacoes (JSON)
    p.observacoes = mergeObservacoesWithCsvExtras(p.observacoes ?? fd.observacoes, csvExtras);
    if (p.tipo === "TITULAR") delete p.titularId;
    return p;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.nomeCompleto || !formData.tipo || !formData.dataEntrada) {
      toast.error("Preencha os campos obrigatórios: Nome, Tipo e Data de Entrada.");
      return;
    }
    if (formData.tipo !== "TITULAR" && !formData.titularId) {
      toast.error("Para FILHO/CONJUGE, é obrigatório selecionar o Titular.");
      return;
    }
    const payload = buildPayload(formData);
    saveMutation.mutate(payload);
  };

  const onDelete = () => {
    if (deleteMutation.isPending) return;
    if (!window.confirm("Tem certeza que deseja excluir este beneficiário?")) return;
    deleteMutation.mutate();
  };

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Novo Beneficiário" : "Editar Beneficiário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-8">
          {/* Identificação */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <LabelWithCsv htmlFor="nomeCompleto" meta={FIELD_META.nomeCompleto} required />
                <Input id="nomeCompleto" name="nomeCompleto" value={formData.nomeCompleto ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="cpf" meta={FIELD_META.cpf} />
                <Input id="cpf" name="cpf" value={formData.cpf ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="tipo" meta={FIELD_META.tipo} required />
                <Select value={formData.tipo ?? undefined} onValueChange={(v) => handleSelectChange("tipo", v)}>
                  <SelectTrigger id="tipo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="FILHO">Filho</SelectItem>
                    <SelectItem value="CONJUGE">Cônjuge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.tipo !== "TITULAR" && (
                <div>
                  <LabelWithCsv htmlFor="titularId" meta={FIELD_META.titularId} required />
                  <Select
                    value={formData.titularId ?? undefined}
                    onValueChange={(v) => handleSelectChange("titularId", v)}
                    disabled={isLoadingTitulares}
                  >
                    <SelectTrigger id="titularId">
                      <SelectValue placeholder={isLoadingTitulares ? "Carregando..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {titulares?.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nomeCompleto}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Dados do Plano */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dados do Plano</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabelWithCsv htmlFor="dataEntrada" meta={FIELD_META.dataEntrada} required />
                <Input id="dataEntrada" name="dataEntrada" type="date" value={formData.dataEntrada ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="valorMensalidade" meta={FIELD_META.valorMensalidade} />
                <Input id="valorMensalidade" name="valorMensalidade" type="number" step="0.01" value={formData.valorMensalidade ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="plano" meta={FIELD_META.plano} />
                <Input id="plano" name="plano" value={formData.plano ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="centroCusto" meta={FIELD_META.centroCusto} />
                <Input id="centroCusto" name="centroCusto" value={formData.centroCusto ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="matricula" meta={FIELD_META.matricula} />
                <Input id="matricula" name="matricula" value={formData.matricula ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="carteirinha" meta={FIELD_META.carteirinha} />
                <Input id="carteirinha" name="carteirinha" value={formData.carteirinha ?? ""} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          {/* Dados Pessoais */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dados Pessoais</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabelWithCsv htmlFor="sexo" meta={FIELD_META.sexo} />
                <Select value={formData.sexo ?? undefined} onValueChange={(v: "M" | "F") => handleSelectChange("sexo", v)}>
                  <SelectTrigger id="sexo"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <LabelWithCsv htmlFor="dataNascimento" meta={FIELD_META.dataNascimento} />
                <Input id="dataNascimento" name="dataNascimento" type="date" value={formData.dataNascimento ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="faixaEtaria" meta={FIELD_META.faixaEtaria} />
                <Input id="faixaEtaria" name="faixaEtaria" value={formData.faixaEtaria ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="estado" meta={FIELD_META.estado} />
                <Input id="estado" name="estado" value={formData.estado ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="contrato" meta={FIELD_META.contrato} />
                <Input id="contrato" name="contrato" value={formData.contrato ?? ""} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          {/* Status & Movimento */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Status & Movimento</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <LabelWithCsv htmlFor="status" meta={FIELD_META.status} />
                <Select value={formData.status ?? undefined} onValueChange={(v) => handleSelectChange("status", v)}>
                  <SelectTrigger id="status"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="INATIVO">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <LabelWithCsv htmlFor="dataSaida" meta={FIELD_META.dataSaida} />
                <Input id="dataSaida" name="dataSaida" type="date" value={formData.dataSaida ?? ""} onChange={handleInputChange} />
              </div>
              <div>
                <LabelWithCsv htmlFor="regimeCobranca" meta={FIELD_META.regimeCobranca} />
                <Select value={formData.regimeCobranca ?? undefined} onValueChange={(v) => handleSelectChange("regimeCobranca", v)}>
                  <SelectTrigger id="regimeCobranca"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                    <SelectItem value="DIARIO">Diário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <LabelWithCsv htmlFor="motivoMovimento" meta={FIELD_META.motivoMovimento} />
                <Select value={formData.motivoMovimento ?? undefined} onValueChange={(v) => handleSelectChange("motivoMovimento", v)}>
                  <SelectTrigger id="motivoMovimento"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCLUSAO">Inclusão</SelectItem>
                    <SelectItem value="EXCLUSAO">Exclusão</SelectItem>
                    <SelectItem value="ALTERACAO">Alteração</SelectItem>
                    <SelectItem value="NENHUM">Nenhum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ======= NOVA SEÇÃO: Dados da Operadora (CSV) ======= */}
          <section>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">Dados da Operadora (CSV)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CSV_EXTRAS.map(({ key, label, type }) => (
                <div key={key}>
                  {/* rótulo sempre mostra o nome amigável + tag do cabeçalho */}
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={`csv_${key}`}>{label}</Label>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CSV: {key}</span>
                  </div>
                  <Input
                    id={`csv_${key}`}
                    name={`csv_${key}`}
                    type={type === "date" ? "date" : type === "tel" ? "tel" : type === "number" ? "number" : "text"}
                    value={(csvExtras[key] ?? "") as string}
                    onChange={(e) => handleCsvExtraChange(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Esses campos são armazenados em <strong>observações</strong> como JSON (chave <code>csvExtras</code>) para preservar o backend atual.
            </p>
          </section>

          {/* Observações */}
          <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-1">
                <LabelWithCsv htmlFor="comentario" meta={FIELD_META.comentario} />
                <Textarea id="comentario" name="comentario" value={formData.comentario ?? ""} onChange={handleInputChange} />
              </div>
              <div className="md:col-span-1">
                <LabelWithCsv htmlFor="observacoes" meta={FIELD_META.observacoes} />
                <Textarea id="observacoes" name="observacoes" value={formData.observacoes ?? ""} onChange={handleInputChange} />
              </div>
            </div>
          </section>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>) : "Salvar"}
            </Button>

            {mode === "edit" && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={deleteMutation.isPending || saveMutation.isPending}>
                {deleteMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>) : (<><Trash2 className="mr-2 h-4 w-4" /> Excluir</>)}
              </Button>
            )}

            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saveMutation.isPending || deleteMutation.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
