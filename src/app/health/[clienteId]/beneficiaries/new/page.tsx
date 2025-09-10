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
import { Loader2 } from "lucide-react";

/* ======================= Tipos ======================= */
type BenefType = "TITULAR" | "FILHO" | "CONJUGE";
type BeneficiaryPayload = {
  nomeCompleto: string;
  cpf?: string;
  tipo: BenefType;
  dataEntrada: string; // yyyy-mm-dd
  valorMensalidade?: string;
  titularId?: string;

  // campos adicionais suportados
  matricula?: string;
  carteirinha?: string;
  sexo?: "M" | "F";
  dataNascimento?: string; // yyyy-mm-dd
  plano?: string;
  centroCusto?: string;
  faixaEtaria?: string;

  observacoes?: string; // extras compactados
};

type Props = {
  mode: "create" | "edit";
  clienteId: string;
  beneficiaryId?: string;
  initialValues?: Partial<BeneficiaryPayload>;
  onSuccessRedirect: string;
};

type TitularOption = { id: string; nomeCompleto: string };

/* ======================= Utils ======================= */
const onlyDigits = (s: string) => s.replace(/\D/g, "");
const maskCPF = (s: string) => {
  const v = onlyDigits(s).slice(0, 11);
  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};
const normMoneyForApi = (v: string) => {
  if (!v) return "";
  return String(v).replace(",", ".").trim();
};
const ageFromBirth = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (isNaN(+d)) return undefined;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};
// Faixas comuns
const faixaFromAge = (age?: number) => {
  if (age == null || age < 0) return undefined;
  if (age <= 18) return "0-18";
  if (age <= 23) return "19-23";
  if (age <= 28) return "24-28";
  if (age <= 33) return "29-33";
  if (age <= 38) return "34-38";
  if (age <= 43) return "39-43";
  if (age <= 48) return "44-48";
  if (age <= 53) return "49-53";
  if (age <= 58) return "54-58";
  return "59+";
};

/* ====== Campos extras do CSV (serão guardados em observacoes -> csvExtras) ====== */
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

type CsvExtrasState = Partial<Record<CsvExtraKey, string>>;

/* ======================= Componente ======================= */
export default function BeneficiaryForm({
  mode,
  clienteId,
  beneficiaryId,
  initialValues,
  onSuccessRedirect,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  /* ------- Estados do formulário ------- */
  const [nomeCompleto, setNomeCompleto] = React.useState(initialValues?.nomeCompleto ?? "");
  const [cpf, setCpf] = React.useState(initialValues?.cpf ?? "");
  const [tipo, setTipo] = React.useState<BenefType | "">(initialValues?.tipo as BenefType ?? "");
  const [dataEntrada, setDataEntrada] = React.useState(initialValues?.dataEntrada ?? "");
  const [valorMensalidade, setValorMensalidade] = React.useState(initialValues?.valorMensalidade ?? "");
  const [titularId, setTitularId] = React.useState(initialValues?.titularId ?? "");

  // novos campos
  const [matricula, setMatricula] = React.useState(initialValues?.matricula ?? "");
  const [carteirinha, setCarteirinha] = React.useState(initialValues?.carteirinha ?? "");
  const [sexo, setSexo] = React.useState<"M" | "F" | "">((initialValues?.sexo as any) ?? "");
  const [dataNascimento, setDataNascimento] = React.useState(initialValues?.dataNascimento ?? "");
  const [plano, setPlano] = React.useState(initialValues?.plano ?? "");
  const [centroCusto, setCentroCusto] = React.useState(initialValues?.centroCusto ?? "");
  const [faixaChoice, setFaixaChoice] = React.useState<string>(initialValues?.faixaEtaria ?? "AUTO");
  const computedFaixa = React.useMemo(() => faixaFromAge(ageFromBirth(dataNascimento)) ?? "-", [dataNascimento]);

  /** extras do CSV */
  const [csvExtras, setCsvExtras] = React.useState<CsvExtrasState>({});

  const isDependent = tipo !== "" && tipo !== "TITULAR";

  /* ------- Lista de Titulares (quando Dependente) ------- */
  const { data: titulares, isLoading: isLoadingTitulares } = useQuery<TitularOption[]>({
    queryKey: ["beneficiaries", { clienteId, tipo: "TITULAR", all: true }],
    queryFn: () =>
      apiFetch(`/clients/${clienteId}/beneficiaries`, {
        query: { tipo: "TITULAR", all: "true" },
      }).then((res: any) => res.items as TitularOption[]),
    enabled: isDependent,
  });

  /* ------- Mutação ------- */
  const mutation = useMutation({
    mutationFn: (payload: BeneficiaryPayload) => {
      const url =
        mode === "create"
          ? `/clients/${clienteId}/beneficiaries`
          : `/clients/${clienteId}/beneficiaries/${beneficiaryId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      return apiFetch(url, { method, body: payload });
    },
    onSuccess: () => {
      toast.success("Beneficiário salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error("Falha ao salvar beneficiário.", { description: errorMessage(e) }),
  });

  /* ------- Helpers de extras ------- */
  const setExtra = (k: CsvExtraKey, v: string) => {
    setCsvExtras((prev) => ({ ...prev, [k]: v }));
    // espelhar em campos principais quando fizer sentido
    if (k === "Usuario" && !nomeCompleto) setNomeCompleto(v);
    if (k === "Cpf" && !cpf) setCpf(v);
    if (k === "Plano" && !plano) setPlano(v);
    if (k === "Matricula" && !matricula) setMatricula(v);
    if (k === "Data_Nascimento" && !dataNascimento) setDataNascimento(v.slice(0, 10));
    if (k === "Dt_Admissao" && !dataEntrada) setDataEntrada(v.slice(0, 10));
    if (k === "Sexo" && !sexo) {
      const up = v?.toUpperCase();
      if (up === "M" || up === "F") setSexo(up);
    }
  };

  /** compacta extras dentro de observacoes */
  const packExtrasIntoObservacoes = (original?: string) => {
    const filled: Record<string, string> = {};
    for (const key of Object.keys(csvExtras) as CsvExtraKey[]) {
      const v = (csvExtras as any)[key];
      if (v != null && String(v).trim() !== "") filled[key] = String(v).trim();
    }
    if (Object.keys(filled).length === 0) return original;
    const prefix = original && original.trim() ? original.trim() + "\n" : "";
    return prefix + JSON.stringify({ csvExtras: filled });
  };

  /* ------- Submit ------- */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!nomeCompleto || !tipo || !dataEntrada) {
      toast.error("Preencha os campos obrigatórios: Nome, Tipo e Data de Entrada.");
      return;
    }
    if (isDependent && !titularId) {
      toast.error("Para dependente (FILHO/CONJUGE), selecione o Titular.");
      return;
    }
    if (dataNascimento && dataEntrada && new Date(dataNascimento) > new Date(dataEntrada)) {
      toast.error("Data de entrada não pode ser anterior à data de nascimento.");
      return;
    }

    const finalFaixa = faixaChoice === "AUTO" ? faixaFromAge(ageFromBirth(dataNascimento)) : faixaChoice;

    const rawCpf = onlyDigits(cpf);
    const cpfForApi = rawCpf.length === 11 ? rawCpf : undefined;

    const mensalidade = normMoneyForApi(valorMensalidade);
    const payload: BeneficiaryPayload = {
      nomeCompleto: nomeCompleto.trim(),
      cpf: cpfForApi,
      tipo: tipo as BenefType,
      dataEntrada,
      valorMensalidade: mensalidade || undefined,
      titularId: isDependent ? titularId : undefined,

      matricula: matricula || undefined,
      carteirinha: carteirinha || undefined,
      sexo: (sexo || undefined) as "M" | "F" | undefined,
      dataNascimento: dataNascimento || undefined,
      plano: plano || undefined,
      centroCusto: centroCusto || undefined,
      faixaEtaria: finalFaixa || undefined,

      observacoes: packExtrasIntoObservacoes(initialValues?.observacoes),
    };

    mutation.mutate(payload);
  };

  return (
    <Card className="max-w-6xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Novo Beneficiário" : "Editar Beneficiário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-8">
          {/* ================== Seção: Identificação ================== */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={maskCPF(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={tipo}
                  onValueChange={(v: BenefType) => {
                    setTipo(v);
                    setTitularId("");
                  }}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="FILHO">Dependente – Filho(a)</SelectItem>
                    <SelectItem value="CONJUGE">Dependente – Cônjuge</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isDependent && (
                <div>
                  <Label htmlFor="titular">Vincular ao Titular *</Label>
                  <Select value={titularId} onValueChange={setTitularId} disabled={isLoadingTitulares}>
                    <SelectTrigger id="titular">
                      <SelectValue placeholder={isLoadingTitulares ? "Carregando titulares..." : "Selecione..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {titulares && titulares.length > 0 ? (
                        titulares.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nomeCompleto}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">Nenhum titular encontrado.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* ================== Seção: Dados do Plano ================== */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados do Plano</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input id="dataEntrada" type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="mensalidade">Mensalidade (R$)</Label>
                <Input
                  id="mensalidade"
                  type="text"
                  inputMode="decimal"
                  value={valorMensalidade}
                  onChange={(e) => setValorMensalidade(e.target.value)}
                  placeholder="123.45"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Use ponto para decimais (ex.: 123.45)</p>
              </div>

              <div>
                <Label htmlFor="plano">Plano</Label>
                <Input id="plano" value={plano} onChange={(e) => setPlano(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Input id="centroCusto" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="matricula">Matrícula</Label>
                <Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="carteirinha">Carteirinha</Label>
                <Input id="carteirinha" value={carteirinha} onChange={(e) => setCarteirinha(e.target.value)} />
              </div>
            </div>
          </section>

          {/* ================== Seção: Dados Pessoais ================== */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="sexo">Sexo</Label>
                <Select value={sexo} onValueChange={(v: "M" | "F") => setSexo(v)}>
                  <SelectTrigger id="sexo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input id="dataNascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
              </div>

              <div>
                <Label htmlFor="faixaEtaria">Faixa Etária</Label>
                <Select value={faixaChoice} onValueChange={setFaixaChoice}>
                  <SelectTrigger id="faixaEtaria">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO">Auto (pelo nascimento)</SelectItem>
                    <SelectItem value="0-18">0–18</SelectItem>
                    <SelectItem value="19-23">19–23</SelectItem>
                    <SelectItem value="24-28">24–28</SelectItem>
                    <SelectItem value="29-33">29–33</SelectItem>
                    <SelectItem value="34-38">34–38</SelectItem>
                    <SelectItem value="39-43">39–43</SelectItem>
                    <SelectItem value="44-48">44–48</SelectItem>
                    <SelectItem value="49-53">49–53</SelectItem>
                    <SelectItem value="54-58">54–58</SelectItem>
                    <SelectItem value="59+">59+</SelectItem>
                  </SelectContent>
                </Select>
                {faixaChoice === "AUTO" && (
                  <p className="text-xs text-muted-foreground">Calculada: <span className="font-medium">{computedFaixa}</span></p>
                )}
              </div>
            </div>
          </section>

          {/* ================== Seção: Dados da Operadora (CSV) ================== */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados da Operadora (CSV)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CSV_EXTRAS.map(({ key, label, type }) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor={`csv_${key}`}>{label}</Label>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">CSV: {key}</span>
                  </div>
                  <Input
                    id={`csv_${key}`}
                    name={`csv_${key}`}
                    type={type === "date" ? "date" : type === "tel" ? "tel" : type === "number" ? "number" : "text"}
                    onChange={(e) => setExtra(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Esses campos são armazenados em <strong>observações</strong> como JSON (chave <code>csvExtras</code>) para não exigir alterações no backend.
            </p>
          </section>

          {/* ================== Ações ================== */}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={mutation.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
