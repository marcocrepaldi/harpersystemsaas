'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { MonthPicker } from './month-picker';

type OptionsResp = {
  tipos: Array<'TITULAR' | 'DEPENDENTE'>;
  planos: string[];
  centros: string[];
};

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
}) {
  const safeList = (arr?: (string | null)[]) =>
    (arr || []).filter((x): x is string => !!x && x.trim().length > 0);

  return (
    <div className="grid w-full gap-3 md:w-auto md:grid-cols-5 items-end">
      <MonthPicker value={mes} onChange={onMesChange} />

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
        <Select value={plano ? plano : allToken} onValueChange={(v) => onPlanoChange(v === allToken ? '' : v)}>
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
        <Select value={centro ? centro : allToken} onValueChange={(v) => onCentroChange(v === allToken ? '' : v)}>
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
