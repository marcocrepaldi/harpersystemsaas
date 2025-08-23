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
import { Loader2 } from "lucide-react";

/* ======================= Tipos ======================= */
type BeneficiaryPayload = {
  nomeCompleto: string;
  cpf?: string;
  tipo: "TITULAR" | "DEPENDENTE";
  dataEntrada: string; // yyyy-mm-dd
  valorMensalidade?: string;
  titularId?: string;

  // novos campos suportados no backend
  matricula?: string;
  carteirinha?: string;
  sexo?: "M" | "F";
  dataNascimento?: string; // yyyy-mm-dd
  plano?: string;
  centroCusto?: string;
  faixaEtaria?: string;
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
// Faixas comuns no mercado (ajuste se necessário)
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

/* ======================= Componente ======================= */
export default function BeneficiaryForm({
  mode,
  clienteId,
  initialValues,
  onSuccessRedirect,
}: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  /* ------- Estados do formulário ------- */
  const [nomeCompleto, setNomeCompleto] = React.useState(initialValues?.nomeCompleto ?? "");
  const [cpf, setCpf] = React.useState(initialValues?.cpf ?? "");
  const [tipo, setTipo] = React.useState<"TITULAR" | "DEPENDENTE" | "">(initialValues?.tipo ?? "");
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

  /* ------- Lista de Titulares (quando Dependente) ------- */
  const { data: titulares, isLoading: isLoadingTitulares } = useQuery<TitularOption[]>({
    queryKey: ["beneficiaries", { clienteId, tipo: "TITULAR", all: true }],
    queryFn: () =>
      apiFetch(`/clients/${clienteId}/beneficiaries`, {
        query: { tipo: "TITULAR", all: true },
      }).then((res: any) => res.items as TitularOption[]),
    enabled: tipo === "DEPENDENTE",
  });

  /* ------- Mutação ------- */
  const mutation = useMutation({
    mutationFn: (payload: BeneficiaryPayload) => {
      const url = `/clients/${clienteId}/beneficiaries`;
      return apiFetch(url, { method: "POST", body: payload });
    },
    onSuccess: () => {
      toast.success("Beneficiário salvo com sucesso!");
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      router.push(onSuccessRedirect);
    },
    onError: (e) => toast.error("Falha ao salvar beneficiário.", { description: errorMessage(e) }),
  });

  /* ------- Submit ------- */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!nomeCompleto || !tipo || !dataEntrada) {
      toast.error("Preencha os campos obrigatórios: Nome, Tipo e Data de Entrada.");
      return;
    }
    if (tipo === "DEPENDENTE" && !titularId) {
      toast.error("Para Dependente, selecione o Titular.");
      return;
    }
    if (dataNascimento && dataEntrada && new Date(dataNascimento) > new Date(dataEntrada)) {
      toast.error("Data de entrada não pode ser anterior à data de nascimento.");
      return;
    }

    const finalFaixa = faixaChoice === "AUTO" ? faixaFromAge(ageFromBirth(dataNascimento)) : faixaChoice;

    const payload: BeneficiaryPayload = {
      nomeCompleto: nomeCompleto.trim(),
      cpf: cpf ? onlyDigits(cpf) : undefined,
      tipo: tipo as "TITULAR" | "DEPENDENTE",
      dataEntrada,
      valorMensalidade: valorMensalidade || undefined,
      titularId: tipo === "DEPENDENTE" ? titularId : undefined,

      matricula: matricula || undefined,
      carteirinha: carteirinha || undefined,
      sexo: (sexo || undefined) as "M" | "F" | undefined,
      dataNascimento: dataNascimento || undefined,
      plano: plano || undefined,
      centroCusto: centroCusto || undefined,
      faixaEtaria: finalFaixa || undefined,
    };

    mutation.mutate(payload);
  };

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "Novo Beneficiário" : "Editar Beneficiário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-6">
          {/* ================== Seção: Identificação ================== */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input id="nome" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={maskCPF(cpf)}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select
                  value={tipo}
                  onValueChange={(v: "TITULAR" | "DEPENDENTE") => {
                    setTipo(v);
                    setTitularId("");
                  }}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITULAR">Titular</SelectItem>
                    <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipo === "DEPENDENTE" && (
                <div className="grid gap-2">
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
          </div>

          {/* ================== Seção: Dados do Plano ================== */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Dados do Plano</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="dataEntrada">Data de Entrada *</Label>
                <Input
                  id="dataEntrada"
                  type="date"
                  value={dataEntrada}
                  onChange={(e) => setDataEntrada(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="mensalidade">Mensalidade (R$)</Label>
                <Input
                  id="mensalidade"
                  type="number"
                  step="0.01"
                  value={valorMensalidade}
                  onChange={(e) => setValorMensalidade(e.target.value)}
                  placeholder="123.45"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plano">Plano</Label>
                <Input id="plano" value={plano} onChange={(e) => setPlano(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="centroCusto">Centro de Custo</Label>
                <Input id="centroCusto" value={centroCusto} onChange={(e) => setCentroCusto(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="carteirinha">Carteirinha</Label>
                <Input id="carteirinha" value={carteirinha} onChange={(e) => setCarteirinha(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ================== Seção: Dados Pessoais ================== */}
          <div className="grid gap-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
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

              <div className="grid gap-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="faixaEtaria">Faixa Etária</Label>
                <Select
                  value={faixaChoice}
                  onValueChange={setFaixaChoice}
                >
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
                  <p className="text-xs text-muted-foreground">
                    Calculada: <span className="font-medium">{computedFaixa}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

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
