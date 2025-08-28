"use client";

import * as React from "react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeAgeInfo, DEFAULT_AGE_BANDS, type AgeBand } from "./age-bands";

/* ============================== Tipos ============================== */

/**
 * Representa a estrutura de um registro de beneficiário vindo da API.
 */
type Row = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;
  // Pode vir "TITULAR", "CONJUGE", "FILHO", "DEPENDENTE", "Titular", "Dependente"…
  tipo: string;
  dataNascimento?: string | null;
  dataEntrada: string;
  valorMensalidade?: string | null;
  titularId?: string | null;
  titularNome?: string | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;
  estado?: string | null;
  contrato?: string | null;
  comentario?: string | null;
};

/**
 * Propriedades esperadas pelo componente BeneficiariesTable.
 * @param items Array de registros de beneficiários.
 * @param ageBands Faixas etárias para cálculo de idade.
 */
export type BeneficiariesTableProps = {
  items: Row[];
  ageBands?: AgeBand[];
};

/* ============================== Utils ============================== */

/**
 * Tipos de beneficiários normalizados.
 */
type NormTipo = "TITULAR" | "CONJUGE" | "FILHO" | "DEPENDENTE";

/**
 * Normaliza a string de tipo de beneficiário para um valor padronizado.
 * Lida com variações como maiúsculas/minúsculas e legados.
 */
function normalizeTipo(raw: string | undefined | null): NormTipo {
  const s = String(raw || "").trim().toUpperCase();
  if (s.startsWith("TITULAR")) return "TITULAR";
  if (s.startsWith("CONJUGE") || s.startsWith("CÔNJUGE")) return "CONJUGE";
  if (s.startsWith("FILHO")) return "FILHO";
  // fallback para tipos legados (ex: "Dependente" / "DEPENDENTE")
  return "DEPENDENTE";
}

/**
 * Retorna a classe CSS para o background de uma linha com base no nível de alerta.
 */
function rowBg(alert: "none" | "moderate" | "high"): string {
  if (alert === "high") return "bg-red-50";
  if (alert === "moderate") return "bg-yellow-50";
  return "";
}

/**
 * Formata um valor numérico para o formato de moeda brasileira (R$).
 * Lida com valores nulos ou inválidos.
 */
function moneyBR(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(String(v).replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para o formato DD/MM/YYYY.
 * Retorna "—" para valores nulos.
 */
function fmtDateYmd(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  const ymd = s.length >= 10 ? s.slice(0, 10) : s;
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

/* ============================ Componente =========================== */

/**
 * Representa um registro de linha com dados normalizados e informações adicionais.
 */
type AugRow = Omit<Row, "tipo"> & {
  tipo: NormTipo;
  _ageInfo: ReturnType<typeof computeAgeInfo>;
};

export default function BeneficiariesTable({ items, ageBands = DEFAULT_AGE_BANDS }: BeneficiariesTableProps) {
  // 1) Normaliza o tipo e adiciona informações de idade (age-bands, alerts)
  // `useMemo` evita re-cálculos desnecessários
  const withAge = useMemo<AugRow[]>(() => {
    const now = new Date();
    return items.map((r) => ({
      ...r,
      tipo: normalizeTipo(r.tipo),
      _ageInfo: computeAgeInfo(r.dataNascimento ?? null, ageBands, now),
    }));
  }, [items, ageBands]);

  // 2) Monta a hierarquia: Titular -> Cônjuges -> Filhos
  // `useMemo` otimiza o processamento e a ordenação
  const rows = useMemo<AugRow[]>(() => {
    // Agrupa dependentes por titularId em um Map para acesso rápido
    const deps = new Map<string, AugRow[]>();
    for (const r of withAge) {
      if (r.tipo !== "TITULAR" && r.titularId) {
        const list = deps.get(r.titularId) ?? [];
        list.push(r);
        deps.set(r.titularId, list);
      }
    }

    // Filtra e ordena os titulares
    const titulares = withAge
      .filter((r) => r.tipo === "TITULAR")
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));

    // Função de ranking para ordenar dependentes: Cônjuge > Filho > Outros
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

    // Adiciona dependentes "órfãos" (sem titularId)
    const orfaos = withAge.filter((r) => r.tipo !== "TITULAR" && !r.titularId);
    if (orfaos.length) {
      orfaos.sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        return ra !== rb ? ra - rb : a.nomeCompleto.localeCompare(b.nomeCompleto);
      });
      out.push(...orfaos);
    }

    // Se a hierarquia não for montada, retorna a lista original.
    return out.length ? out : withAge;
  }, [withAge]);

  return (
    <TooltipProvider>
      <div className="rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Nome</th>
                <th className="px-3 py-2 text-left">CPF</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Idade</th>
                <th className="px-3 py-2 text-left">Nascimento</th>
                <th className="px-3 py-2 text-left">Vigência</th>
                <th className="px-3 py-2 text-left">Mensalidade</th>
                <th className="px-3 py-2 text-left">Plano</th>
                <th className="px-3 py-2 text-left">Centro de Custo</th>
                <th className="px-3 py-2 text-left">Faixa Etária</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Contrato</th>
                <th className="px-3 py-2 text-left">Comentário</th>
                <th className="px-3 py-2 text-left">Titular</th>
              </tr>
            </thead>
            <tbody>
              {/* Mapeia e renderiza cada linha de dados */}
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

                // Texto "amigável" do tipo para o badge
                const tipoLabel =
                  r.tipo === "CONJUGE" ? "Cônjuge" : r.tipo === "FILHO" ? "Filho(a)" : r.tipo === "TITULAR" ? "Titular" : "Dependente";

                return (
                  <tr key={r.id} className={`${bg} border-b last:border-b-0`}>
                    <td className={`px-3 py-2 font-medium ${isDependente ? "pl-10" : ""}`}>
                      {isDependente && "↳ "}
                      {r.nomeCompleto}
                    </td>
                    <td className="px-3 py-2">{r.cpf ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.tipo === "TITULAR" ? "default" : "secondary"}>{tipoLabel}</Badge>
                    </td>

                    <td className="px-3 py-2">
                      {showTooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">
                              {ai.age ?? "—"}
                              {label ? <span className="ml-2 text-xs text-muted-foreground">({label})</span> : null}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{tooltipMsg}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span>{ai.age ?? "—"}</span>
                      )}
                    </td>

                    <td className="px-3 py-2">{fmtDateYmd(r.dataNascimento)}</td>
                    <td className="px-3 py-2">{fmtDateYmd(r.dataEntrada)}</td>
                    <td className="px-3 py-2">{moneyBR(r.valorMensalidade)}</td>
                    <td className="px-3 py-2">{r.plano ?? "—"}</td>
                    <td className="px-3 py-2">{r.centroCusto ?? "—"}</td>
                    <td className="px-3 py-2">{r.faixaEtaria ?? (ai.band ? ai.band.label : "—")}</td>
                    <td className="px-3 py-2">{r.estado ?? "—"}</td>
                    <td className="px-3 py-2">{r.contrato ?? "—"}</td>
                    <td className="px-3 py-2">{r.comentario ?? "—"}</td>
                    <td className="px-3 py-2">{r.titularNome ?? r.titularId ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}