"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  observacoes?: string | null;
  size?: "sm" | "md";
  className?: string;
  enableDialog?: boolean;
};

const CPF_MARK = "[IMPORTAÇÃO] CPF";

/** Exportado para permitir filtros na lista */
export function parseCpfIssues(observacoes?: string | null) {
  if (!observacoes) return null;
  const lines = observacoes.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const cpfLines = lines.filter((l) => l.includes(CPF_MARK));
  if (cpfLines.length === 0) return null;

  const issues = cpfLines.map((l) => {
    const rawCpf = (l.match(/(\d{3,})/)?.[1] ?? "").trim();
    const isLen = /tamanho diferente de 11/i.test(l);
    const isDv = /verificador|DV|inválid|invalido/i.test(l);
    const type = isLen ? "LEN" : isDv ? "DV" : "GEN";
    const short =
      type === "LEN"
        ? "CPF com tamanho inválido"
        : type === "DV"
        ? "CPF inválido (dígito verificador)"
        : "CPF inválido";
    return { line: l, type, rawCpf, short };
  });

  issues.sort((a, b) => {
    const p = (t: string) => (t === "LEN" ? 3 : t === "DV" ? 2 : 1);
    return p(b.type) - p(a.type);
  });

  return {
    issues,
    primary: issues[0],
    text: cpfLines.join("\n"),
  };
}

export function CpfNoteBadge({ observacoes, size = "sm", className, enableDialog = true }: Props) {
  const parsed = useMemo(() => parseCpfIssues(observacoes), [observacoes]);
  const [open, setOpen] = useState(false);

  if (!parsed) return null;

  const { primary } = parsed;
  const badgeClasses = cn(
    "inline-flex items-center gap-1 cursor-pointer",
    size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
    "bg-amber-100 text-amber-800 border border-amber-300 rounded-md",
    className
  );

  const content = (
    <>
      <AlertCircle className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      <span>{primary?.short ?? "CPF inválido"}</span>
    </>
  );

  const tooltipText =
    primary?.type === "LEN"
      ? "O CPF tem tamanho diferente de 11 dígitos."
      : primary?.type === "DV"
      ? "O CPF tem 11 dígitos, mas falhou na validação de DV."
      : "CPF marcado como inválido durante a importação.";

  if (!enableDialog) {
    return (
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={badgeClasses}>{content}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs whitespace-pre-wrap">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={250}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Badge className={badgeClasses}>{content}</Badge>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs whitespace-pre-wrap">
            {tooltipText} Clique para ver detalhes.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Observação sobre CPF</DialogTitle>
          <DialogDescription>
            Marcações automáticas geradas durante a importação.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {parsed.text}
        </div>
      </DialogContent>
    </Dialog>
  );
}
