"use client";

import * as React from "react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeAgeInfo, DEFAULT_AGE_BANDS, type AgeBand } from "./age-bands";

/* ============================== Tipos ============================== */

/** Chaves extras vindas do CSV/operadora (armazenadas em observações ou campo dedicado). */
type CsvExtraKey =
  | "Empresa" | "Cpf" | "Usuario" | "Nm_Social" | "Estado_Civil" | "Data_Nascimento" | "Sexo"
  | "Identidade" | "Orgao_Exp" | "Uf_Orgao" | "Uf_Endereco" | "Cidade" | "Tipo_Logradouro"
  | "Logradouro" | "Numero" | "Complemento" | "Bairro" | "Cep" | "Fone" | "Celular" | "Plano"
  | "Matricula" | "Filial" | "Codigo_Usuario" | "Dt_Admissao" | "Codigo_Congenere" | "Nm_Congenere"
  | "Tipo_Usuario" | "Nome_Mae" | "Pis" | "Cns" | "Ctps" | "Serie_Ctps" | "Data_Processamento"
  | "Data_Cadastro" | "Unidade" | "Descricao_Unidade" | "Cpf_Dependente" | "Grau_Parentesco"
  | "Dt_Casamento" | "Nu_Registro_Pessoa_Natural" | "Cd_Tabela" | "Empresa_Utilizacao" | "Dt_Cancelamento";

/** Registro vindo da API (agora compatível com o novo layout/campos) */
type Row = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;

  // Pode vir "TITULAR", "CONJUGE", "FILHO", "DEPENDENTE", variações…
  tipo: string;

  /** Dados Pessoais */
  dataNascimento?: string | null;
  sexo?: "M" | "F" | null;

  /** Vigência / Plano */
  dataEntrada: string;
  valorMensalidade?: string | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;

  /** Identificadores do plano */
  matricula?: string | null;
  carteirinha?: string | null;

  /** Vínculo */
  titularId?: string | null;
  titularNome?: string | null;

  /** Metadados administrativos */
  estado?: string | null;   // UF
  contrato?: string | null;
  comentario?: string | null;

  /** Novos campos de status/movimento */
  status?: "ATIVO" | "INATIVO" | null;
  dataSaida?: string | null;
  regimeCobranca?: "MENSAL" | "DIARIO" | null;
  motivoMovimento?: "INCLUSAO" | "EXCLUSAO" | "ALTERACAO" | "NENHUM" | null;

  /** Extras da operadora (lidos do CSV) */
  csvExtras?: Partial<Record<CsvExtraKey, string | null>>;
};

/** Props da tabela */
export type BeneficiariesTableProps = {
  items: Row[];
  ageBands?: AgeBand[];
};

/* ============================== Utils ============================== */

type NormTipo = "TITULAR" | "CONJUGE" | "FILHO" | "DEPENDENTE";

/** Normaliza o tipo */
function normalizeTipo(raw: string | undefined | null): NormTipo {
  const s = String(raw || "").trim().toUpperCase();
  if (s.startsWith("TITULAR")) return "TITULAR";
  if (s.startsWith("CONJUGE") || s.startsWith("CÔNJUGE")) return "CONJUGE";
  if (s.startsWith("FILHO")) return "FILHO";
  return "DEPENDENTE";
}

/** BG por alerta de faixas */
function rowBg(alert: "none" | "moderate" | "high"): string {
  if (alert === "high") return "bg-red-50";
  if (alert === "moderate") return "bg-yellow-50";
  return "";
}

/** Moeda BR */
function moneyBR(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(String(v).replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

/** Data YYYY-MM-DD -> DD/MM/YYYY */
function fmtDateYmd(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  const ymd = s.length >= 10 ? s.slice(0, 10) : s;
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

/** Tenta formatar datas que eventualmente venham em ISO; caso contrário, devolve o valor bruto. */
function fmtMaybeDate(s?: string | null) {
  if (!s) return "—";
  const t = String(s).trim();
  // heurística simples: se vier em ISO, formata; se vier em dd/mm/yyyy, mantém
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return fmtDateYmd(t);
  return t || "—";
}

/** Badge do status */
function statusBadgeVariant(st?: "ATIVO" | "INATIVO" | null): "default" | "secondary" | "destructive" {
  if (!st) return "secondary";
  return st === "ATIVO" ? "default" : "destructive";
}

/* ----- Definição das colunas extras (Operadora/CSV) ----- */
const CSV_COLUMNS: Array<{ key: CsvExtraKey; label: string; isDate?: boolean }> = [
  { key: "Empresa", label: "Empresa" },
  { key: "Usuario", label: "Usuário (Operadora)" },
  { key: "Nm_Social", label: "Nome Social" },
  { key: "Estado_Civil", label: "Estado Civil" },
  { key: "Data_Nascimento", label: "Nascimento (Operadora)", isDate: true },
  { key: "Sexo", label: "Sexo (Operadora)" },
  { key: "Identidade", label: "Identidade" },
  { key: "Orgao_Exp", label: "Órgão Exp." },
  { key: "Uf_Orgao", label: "UF Órgão" },
  { key: "Uf_Endereco", label: "UF Endereço" },
  { key: "Cidade", label: "Cidade" },
  { key: "Tipo_Logradouro", label: "Tipo Logradouro" },
  { key: "Logradouro", label: "Logradouro" },
  { key: "Numero", label: "Número" },
  { key: "Complemento", label: "Complemento" },
  { key: "Bairro", label: "Bairro" },
  { key: "Cep", label: "CEP" },
  { key: "Fone", label: "Telefone" },
  { key: "Celular", label: "Celular" },
  { key: "Filial", label: "Filial" },
  { key: "Codigo_Usuario", label: "Código Usuário" },
  { key: "Dt_Admissao", label: "Admissão", isDate: true },
  { key: "Codigo_Congenere", label: "Cód. Congênere" },
  { key: "Nm_Congenere", label: "Nome Congênere" },
  { key: "Tipo_Usuario", label: "Tipo Usuário" },
  { key: "Nome_Mae", label: "Nome da Mãe" },
  { key: "Pis", label: "PIS" },
  { key: "Cns", label: "CNS" },
  { key: "Ctps", label: "CTPS" },
  { key: "Serie_Ctps", label: "Série CTPS" },
  { key: "Data_Processamento", label: "Processamento", isDate: true },
  { key: "Data_Cadastro", label: "Cadastro", isDate: true },
  { key: "Unidade", label: "Unidade" },
  { key: "Descricao_Unidade", label: "Descrição Unidade" },
  { key: "Cpf_Dependente", label: "CPF Dependente" },
  { key: "Grau_Parentesco", label: "Grau Parentesco" },
  { key: "Dt_Casamento", label: "Data Casamento", isDate: true },
  { key: "Nu_Registro_Pessoa_Natural", label: "Nº RPN" },
  { key: "Cd_Tabela", label: "Cód. Tabela" },
  { key: "Empresa_Utilizacao", label: "Empresa Utilização" },
  { key: "Dt_Cancelamento", label: "Cancelamento", isDate: true },
];

/* ============================ Componente =========================== */

type AugRow = Omit<Row, "tipo"> & {
  tipo: NormTipo;
  _ageInfo: ReturnType<typeof computeAgeInfo>;
};

export default function BeneficiariesTable({ items, ageBands = DEFAULT_AGE_BANDS }: BeneficiariesTableProps) {
  // 1) Normaliza o tipo e adiciona age-info
  const withAge = useMemo<AugRow[]>(() => {
    const now = new Date();
    return items.map((r) => ({
      ...r,
      tipo: normalizeTipo(r.tipo),
      _ageInfo: computeAgeInfo(r.dataNascimento ?? null, ageBands, now),
    }));
  }, [items, ageBands]);

  // 2) Hierarquia Titular -> dependentes (cônjuge > filho > outros)
  const rows = useMemo<AugRow[]>(() => {
    const deps = new Map<string, AugRow[]>();
    for (const r of withAge) {
      if (r.tipo !== "TITULAR" && r.titularId) {
        const list = deps.get(r.titularId) ?? [];
        list.push(r);
        deps.set(r.titularId, list);
      }
    }
    const titulares = withAge
      .filter((r) => r.tipo === "TITULAR")
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    const rank = (x: AugRow) => (x.tipo === "CONJUGE" ? 0 : x.tipo === "FILHO" ? 1 : 2);

    const out: AugRow[] = [];
    for (const t of titulares) {
      out.push(t);
      const children = (deps.get(t.id) ?? []).sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        return ra !== rb ? ra - rb : a.nomeCompleto.localeCompare(b.nomeCompleto);
      });
      out.push(...children);
    }

    const orfaos = withAge.filter((r) => r.tipo !== "TITULAR" && !r.titularId);
    if (orfaos.length) {
      orfaos.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        return ra !== rb ? ra - rb : a.nomeCompleto.localeCompare(b.nomeCompleto);
      });
      out.push(...orfaos);
    }

    return out.length ? out : withAge;
  }, [withAge]);

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                {/* Principais */}
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">CPF</th>
                <th className="px-3 py-2 text-left">Tipo</th>

                {/* Dados Pessoais */}
                <th className="px-3 py-2 text-left">Sexo</th>
                <th className="px-3 py-2 text-left">Idade</th>
                <th className="px-3 py-2 text-left">Nascimento</th>

                {/* Dados do Plano */}
                <th className="px-3 py-2 text-left">Vigência</th>
                <th className="px-3 py-2 text-left">Mensalidade</th>
                <th className="px-3 py-2 text-left">Plano</th>
                <th className="px-3 py-2 text-left">Centro de Custo</th>
                <th className="px-3 py-2 text-left">Matrícula</th>
                <th className="px-3 py-2 text-left">Carteirinha</th>

                {/* Status & Movimento */}
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Saída</th>
                <th className="px-3 py-2 text-left">Regime</th>
                <th className="px-3 py-2 text-left">Movimento</th>

                {/* Complementares */}
                <th className="px-3 py-2 text-left">Faixa Etária</th>
                <th className="px-3 py-2 text-left">UF</th>
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-left">Comentário</th>
                <th className="px-3 py-2 text-left">Titular</th>

                {/* --------- NOVO: Operadora / CSV (todas as colunas) --------- */}
                {CSV_COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-left">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const ai = r._ageInfo;
                const bg = rowBg(ai.alert);
                const showTooltip = ai.alert === "high" || ai.alert === "moderate";
                const label = ai.alert === "high" ? "Alerta alto" : ai.alert === "moderate" ? "Alerta moderado" : null;
                const tooltipMsg =
                  ai.monthsUntilBandChange != null && ai.monthsUntilBandChange >= 0
                    ? `Muda de faixa em ${ai.monthsUntilBandChange} ${ai.monthsUntilBandChange === 1 ? "mês" : "meses"}`
                    : "Sem mudança de faixa prevista";

                const isDependente = r.tipo !== "TITULAR";
                const tipoLabel =
                  r.tipo === "CONJUGE" ? "Cônjuge" : r.tipo === "FILHO" ? "Filho(a)" : r.tipo === "TITULAR" ? "Titular" : "Dependente";

                const getExtra = (k: CsvExtraKey) => r.csvExtras?.[k] ?? null;

                return (
                  <tr key={r.id} className={`${bg} border-b last:border-b-0`}>
                    {/* Principais */}
                    <td className={`px-3 py-2 font-medium ${isDependente ? "pl-10" : ""}`}>
                      {isDependente && "↳ "}
                      {r.nomeCompleto}
                    </td>
                    <td className="px-3 py-2">{r.cpf ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.tipo === "TITULAR" ? "default" : "secondary"}>{tipoLabel}</Badge>
                    </td>

                    {/* Pessoais */}
                    <td className="px-3 py-2">{r.sexo ?? "—"}</td>
                    <td className="px-3 py-2">
                      {showTooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">
                              {ai.age ?? "—"}
                              {label ? <span className="ml-2 text-xs text-muted-foreground">({label})</span> : null}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent><p>{tooltipMsg}</p></TooltipContent>
                        </Tooltip>
                      ) : (
                        <span>{ai.age ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{fmtDateYmd(r.dataNascimento)}</td>

                    {/* Plano */}
                    <td className="px-3 py-2">{fmtDateYmd(r.dataEntrada)}</td>
                    <td className="px-3 py-2">{moneyBR(r.valorMensalidade)}</td>
                    <td className="px-3 py-2">{r.plano ?? "—"}</td>
                    <td className="px-3 py-2">{r.centroCusto ?? "—"}</td>
                    <td className="px-3 py-2">{r.matricula ?? "—"}</td>
                    <td className="px-3 py-2">{r.carteirinha ?? "—"}</td>

                    {/* Status & Movimento */}
                    <td className="px-3 py-2">
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status ?? "—"}</Badge>
                    </td>
                    <td className="px-3 py-2">{fmtDateYmd(r.dataSaida)}</td>
                    <td className="px-3 py-2">{r.regimeCobranca ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.motivoMovimento
                        ? r.motivoMovimento === "INCLUSAO" ? "Inclusão"
                          : r.motivoMovimento === "EXCLUSAO" ? "Exclusão"
                          : r.motivoMovimento === "ALTERACAO" ? "Alteração"
                          : "Nenhum"
                        : "—"}
                    </td>

                    {/* Complementares */}
                    <td className="px-3 py-2">{r.faixaEtaria ?? (ai.band ? ai.band.label : "—")}</td>
                    <td className="px-3 py-2">{r.estado ?? "—"}</td>
                    <td className="px-3 py-2">{r.contrato ?? "—"}</td>
                    <td className="px-3 py-2">{r.comentario ?? "—"}</td>
                    <td className="px-3 py-2">{r.titularNome ?? r.titularId ?? "—"}</td>

                    {/* Operadora/CSV */}
                    {CSV_COLUMNS.map((c) => {
                      const raw = getExtra(c.key);
                      const val = c.isDate ? fmtMaybeDate(raw ?? undefined) : (raw ?? "—");
                      return (
                        <td key={c.key} className="px-3 py-2">{val || "—"}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé com legenda */}
        <div className="px-3 py-2 text-xs text-muted-foreground border-t space-x-4">
          <span>• Dados Pessoais: Sexo, Idade, Nascimento</span>
          <span>• Plano: Vigência, Mensalidade, Plano, CC, Matrícula, Carteirinha</span>
          <span>• Status &amp; Movimento: Status, Saída, Regime, Movimento</span>
          <span>• Operadora/CSV: todos os campos adicionais importados</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
