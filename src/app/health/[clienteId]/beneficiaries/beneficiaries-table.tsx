"use client";

import { useMemo } from "react";
import { computeAgeInfo, DEFAULT_AGE_BANDS, AgeBand } from "./age-bands";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Se você já tem um Table do shadcn, pode trocar pelo seu.
// Aqui deixo <table> simples com Tailwind para não conflitar com sua estrutura.
type Row = {
  id: string;
  nomeCompleto: string;
  cpf?: string | null;
  tipo: "TITULAR" | "DEPENDENTE";
  dataNascimento?: string | null;
  dataEntrada: string;
  valorMensalidade?: string | null;
  titularNome?: string | null;  // opcional, se você já resolve no servidor
  titularId?: string | null;
  plano?: string | null;
  centroCusto?: string | null;
  faixaEtaria?: string | null;  // se você armazena texto da faixa
  estado?: string | null;
  contrato?: string | null;
  comentario?: string | null;
};

export type BeneficiariesTableProps = {
  items: Row[];
  ageBands?: AgeBand[]; // opcional: permite customizar as faixas
};

function rowBg(alert: "none" | "moderate" | "high"): string {
  if (alert === "high") return "bg-red-50";
  if (alert === "moderate") return "bg-yellow-50";
  return "";
}

function moneyBR(v?: string | null) {
  if (v == null || v === "") return "—";
  const n = Number(String(v).replace(",", "."));
  if (isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
}

function fmtDateYmd(v?: string | null) {
  if (!v) return "—";
  // espera "YYYY-MM-DD" ou ISO completo; exibe DD/MM/YYYY
  const s = String(v);
  const ymd = s.length >= 10 ? s.slice(0, 10) : s; // protege
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

export default function BeneficiariesTable({ items, ageBands = DEFAULT_AGE_BANDS }: BeneficiariesTableProps) {
  const rows = useMemo(() => {
    const now = new Date();
    return items.map((r) => {
      const ageInfo = computeAgeInfo(r.dataNascimento ?? null, ageBands, now);
      return { ...r, _ageInfo: ageInfo };
    });
  }, [items, ageBands]);

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
              {rows.map((r) => {
                const ai = r._ageInfo as ReturnType<typeof computeAgeInfo>;
                const bg = rowBg(ai.alert);
                const showTooltip = ai.alert === "high" || ai.alert === "moderate";

                const label =
                  ai.alert === "high"
                    ? "Alerta alto"
                    : ai.alert === "moderate"
                    ? "Alerta moderado"
                    : null;

                const tooltipMsg =
                  ai.monthsUntilBandChange != null && ai.monthsUntilBandChange >= 0
                    ? `Muda de faixa em ${ai.monthsUntilBandChange} ${ai.monthsUntilBandChange === 1 ? "mês" : "meses"}`
                    : "Sem mudança de faixa prevista";

                return (
                  <tr key={r.id} className={`${bg} border-b last:border-b-0`}>
                    <td className="px-3 py-2 font-medium">{r.nomeCompleto}</td>
                    <td className="px-3 py-2">{r.cpf ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.tipo === "TITULAR" ? "default" : "secondary"}>{r.tipo}</Badge>
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
