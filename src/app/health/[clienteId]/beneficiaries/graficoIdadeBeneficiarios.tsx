"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type Item = {
  dataNascimento?: string | null; // ISO ou "YYYY-MM-DD"
  idade?: number | null;          // se já vier calculada, usamos ela
};

type AgeBand = { min: number; max: number; label: string };

const DEFAULT_AGE_BANDS: AgeBand[] = [
  { min: 0,  max: 18,  label: "0–18" },
  { min: 19, max: 23,  label: "19–23" },
  { min: 24, max: 28,  label: "24–28" },
  { min: 29, max: 33,  label: "29–33" },
  { min: 34, max: 38,  label: "34–38" },
  { min: 39, max: 43,  label: "39–43" },
  { min: 44, max: 48,  label: "44–48" },
  { min: 49, max: 53,  label: "49–53" },
  { min: 54, max: 58,  label: "54–58" },
  { min: 59, max: 200, label: "59+"  },
];

type Props = {
  items: Item[];
  title?: string;
  subtitle?: string;
  /** Modo de agrupamento: "bands" (faixas do negócio) ou "exact" (por idade / binSize). */
  mode?: "bands" | "exact";
  /** Para mode="exact": tamanho do “balde” (1 = idade exata; 5 = grupos de 5 anos). */
  binSize?: number;
  /** Filtro de idades. Aplica-se a ambos os modos. */
  range?: { min?: number; max?: number };
  /** Para mode="bands": sobrescrever faixas (opcional). */
  bands?: AgeBand[];
};

const chartConfig = {
  vidas: { label: "Vidas", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Idade inteira hoje baseada em data de nascimento (sem bugs de fuso). */
function ageFromDob(dobIso: string, ref = new Date()): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

function bucketLabel(start: number, size: number) {
  if (size <= 1) return String(start);
  const end = start + (size - 1);
  return `${start}–${end}`;
}

export function GraficoIdadeBeneficiarios({
  items,
  title,
  subtitle = "Distribuição atual",
  mode = "bands",
  binSize = 1,
  range,
  bands = DEFAULT_AGE_BANDS,
}: Props) {
  const chartTitle = title ?? (mode === "bands" ? "Vidas por faixa etária" : "Vidas por idade");

  // 1) extrai idades válidas e aplica range (se houver)
  const ages = React.useMemo(() => {
    const today = new Date();
    const arr: number[] = items
      .map((it) => (it.idade ?? ageFromDob(it.dataNascimento ?? "", today)))
      .filter((n): n is number => typeof n === "number" && isFinite(n) && n >= 0);

    if (!range) return arr;
    return arr.filter((a) => {
      if (range.min != null && a < range.min) return false;
      if (range.max != null && a > range.max) return false;
      return true;
    });
  }, [items, range]);

  // 2) agrega conforme o modo
  const data = React.useMemo(() => {
    if (ages.length === 0) return [];

    if (mode === "bands") {
      // Pré-inicializa para manter ordem/labels mesmo com 0
      const counts = new Map<string, { label: string; start: number; vidas: number }>();
      for (const b of bands) counts.set(b.label, { label: b.label, start: b.min, vidas: 0 });

      for (const a of ages) {
        const band = bands.find((b) => a >= b.min && a <= b.max);
        if (!band) continue;
        const prev = counts.get(band.label)!;
        prev.vidas += 1;
      }

      return Array.from(counts.values()).sort((x, y) => x.start - y.start);
    }

    // mode === "exact"
    const uniqueAges = new Set(ages).size;
    const effectiveBinSize = binSize === 1 && uniqueAges > 40 ? 5 : binSize;

    const counts = new Map<string, { label: string; start: number; vidas: number }>();
    for (const a of ages) {
      const start = effectiveBinSize === 1 ? a : Math.floor(a / effectiveBinSize) * effectiveBinSize;
      const label = bucketLabel(start, effectiveBinSize);
      const prev = counts.get(label);
      if (prev) prev.vidas += 1;
      else counts.set(label, { label, start, vidas: 1 });
    }
    return Array.from(counts.values()).sort((x, y) => x.start - y.start);
  }, [ages, mode, binSize, bands]);

  const totalVidas = React.useMemo(() => items.length, [items]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="mx-auto h-[280px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={30}
              allowDecimals={false}
              fontSize={12}
            />
            <ChartTooltip
              cursor={{ opacity: 0.1 }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar dataKey="vidas" fill="var(--color-vidas)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>

      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Total de vidas: {totalVidas} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          {mode === "bands"
            ? "Mostrando contagem por faixas etárias (0–18, 19–23, …, 59+)"
            : `Mostrando contagem agregada ${
                binSize === 1 ? "por idade" : `em grupos de ${binSize} anos`
              }`}
        </div>
      </CardFooter>
    </Card>
  );
}
