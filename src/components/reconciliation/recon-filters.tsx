'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { MonthPicker } from './month-picker';

type OptionsResp = {
  tipos: Array<'TITULAR' | 'DEPENDENTE'>;
  planos: string[];
  centros: string[];
};

type InsurerOpt = { id: string; name?: string; tradeName?: string };

export function ReconFilters({
  mes,
  onMesChange,
  tipo,
  onTipoChange,
  plano,
  onPlanoChange,
  centro,
  onCentroChange,
  options,
  allToken = '__ALL__',

  // --- NOVO (opcional): seguradora ---
  insurers,
  insurerId,
  onInsurerChange,
}: {
  mes: string;
  onMesChange: (v: string) => void;

  tipo: 'ALL' | 'TITULAR' | 'DEPENDENTE';
  onTipoChange: (v: 'ALL' | 'TITULAR' | 'DEPENDENTE') => void;

  plano: string;
  onPlanoChange: (v: string) => void;

  centro: string;
  onCentroChange: (v: string) => void;

  options?: OptionsResp;
  allToken?: string;

  /** lista opcional de seguradoras (quando fornecida, mostramos o seletor) */
  insurers?: InsurerOpt[];
  /** id atual da seguradora; null/undefined = “Sem seguradora (legado)” */
  insurerId?: string | null;
  /** callback opcional para mudança da seguradora */
  onInsurerChange?: (v: string | null) => void;
}) {
  const safeList = (arr?: (string | null)[]) =>
    (arr || []).filter((x): x is string => !!x && x.trim().length > 0);

  const hasInsurerSelector = Array.isArray(insurers) && insurers.length > 0 && !!onInsurerChange;
  const NONE_TOKEN = '__NONE__';

  const insurerLabel = (i: InsurerOpt) => (i.name ?? i.tradeName ?? '').trim() || i.id;

  return (
    <div className="grid w-full gap-3 md:w-auto md:grid-cols-6 items-end">
      <MonthPicker value={mes} onChange={onMesChange} />

      {/* Seguradora (opcional) */}
      {hasInsurerSelector ? (
        <div className="grid gap-1">
          <Label className="text-xs">Seguradora</Label>
          <Select
            value={insurerId ?? NONE_TOKEN}
            onValueChange={(v) => onInsurerChange?.(v === NONE_TOKEN ? null : v)}
          >
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_TOKEN}>Sem seguradora (legado)</SelectItem>
              {insurers!.map((ins) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {insurerLabel(ins)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="grid gap-1">
        <Label className="text-xs">Tipo</Label>
        <Select value={tipo} onValueChange={(v) => onTipoChange(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="TITULAR">Titular</SelectItem>
            <SelectItem value="DEPENDENTE">Dependente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs">Plano</Label>
        <Select
          value={plano ? plano : allToken}
          onValueChange={(v) => onPlanoChange(v === allToken ? '' : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allToken}>Todos</SelectItem>
            {safeList(options?.planos).map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs">Centro de custo</Label>
        <Select
          value={centro ? centro : allToken}
          onValueChange={(v) => onCentroChange(v === allToken ? '' : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Centro de custo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={allToken}>Todos</SelectItem>
            {safeList(options?.centros).map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
