// src/components/clients/ServicePicker.tsx
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";

export type Service = { id: string; slug: string; name: string; isActive: boolean };

type Props = {
  value: string[];                          // slugs selecionados
  onChange: (slugs: string[]) => void;
  principalSlugs?: string[];                // destaques (chips)
  title?: string;
  /**
   * Opcional: mapear slug -> rótulo em português.
   * Se não informado, usa o mapa interno DEFAULT_LABELS_PT_BR.
   */
  labelsPtBr?: Record<string, string>;
};

/** Mapa padrão de rótulos em PT-BR para slugs comuns */
const DEFAULT_LABELS_PT_BR: Record<string, string> = {
  HEALTH: "Saúde",
  DENTAL: "Odonto",
  LIFE: "Vida",
  AUTO: "Auto",
  HOME: "Residencial",
  TRAVEL: "Viagem",
  RC: "Responsabilidade Civil",
  PET: "Pet",
  BIKE: "Bicicleta",
  PHONE: "Celular",
  BUSINESS: "Empresarial",
  CONDO: "Condomínio",
  EDU: "Educacional",
  EQUIPMENT: "Equipamentos",
  CYBER: "Riscos Cibernéticos",
  // adicione outros slugs aqui conforme necessário
};

export function ServicePicker({
  value,
  onChange,
  principalSlugs = ["HEALTH", "DENTAL", "LIFE", "AUTO", "HOME", "TRAVEL", "RC"],
  title = "Serviços contratados",
  labelsPtBr,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [all, setAll] = React.useState<Service[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");

  const LABELS = React.useMemo(
    () => ({ ...DEFAULT_LABELS_PT_BR, ...(labelsPtBr || {}) }),
    [labelsPtBr]
  );

  const getLabel = React.useCallback(
    (s: Pick<Service, "slug" | "name"> | undefined) => {
      if (!s) return "";
      return LABELS[s.slug] || s.name || s.slug;
    },
    [LABELS]
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // ajuste a rota se sua API for diferente
        const data = await apiFetch<Service[]>("/services?active=true");
        if (mounted) setAll(data ?? []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const bySlug = React.useMemo(() => {
    const map = new Map(all.map((s) => [s.slug, s]));
    return map;
  }, [all]);

  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else onChange([...value, slug]);
  };

  const clear = () => onChange([]);

  const selected = value.map(
    (slug) => bySlug.get(slug) || { slug, name: slug, id: slug, isActive: true }
  );

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter((s) => {
      const label = getLabel(s).toLowerCase();
      return (
        s.slug.toLowerCase().includes(qq) ||
        (s.name || "").toLowerCase().includes(qq) ||
        label.includes(qq)
      );
    });
  }, [all, q, getLabel]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {/* Chips de destaques (rápidos) */}
        <div className="flex flex-wrap gap-2">
          {principalSlugs.map((slug) => {
            const s = bySlug.get(slug) || { slug, name: slug, id: slug, isActive: true };
            const active = value.includes(slug);
            return (
              <Button
                key={slug}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn("rounded-full", active && "shadow")}
                onClick={() => toggle(slug)}
                disabled={loading}
              >
                {getLabel(s)}
              </Button>
            );
          })}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="secondary" size="sm">
                {loading ? "Carregando..." : "Adicionar outros…"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="start">
              <div className="p-3 border-b">
                <Label htmlFor="svc-search" className="sr-only">
                  Buscar
                </Label>
                <Input
                  id="svc-search"
                  placeholder="Buscar serviço por nome (PT) ou slug…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <Command>
                <CommandInput placeholder="Digite para filtrar…" />
                <CommandList className="max-h-72">
                  <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((s) => {
                      const checked = value.includes(s.slug);
                      return (
                        <CommandItem
                          key={s.id}
                          onSelect={() => toggle(s.slug)}
                          className="flex items-center gap-2"
                        >
                          <Checkbox checked={checked} className="pointer-events-none" />
                          <div className="flex flex-col">
                            <span className="text-sm">{getLabel(s)}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {s.slug}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>

              <div className="p-2 border-t flex justify-between">
                <Button variant="ghost" size="sm" onClick={clear} disabled={!value.length}>
                  Limpar seleção
                </Button>
                <Button size="sm" onClick={() => setOpen(false)}>
                  Concluir
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Selecionados (badges) */}
        {selected.length ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <Badge key={s.slug} variant="secondary" className="gap-1">
                {getLabel(s)}
                <button
                  type="button"
                  aria-label={`Remover ${getLabel(s)}`}
                  className="ml-1 opacity-70 hover:opacity-100"
                  onClick={() => toggle(s.slug)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum serviço selecionado.</p>
        )}
      </CardContent>
    </Card>
  );
}
