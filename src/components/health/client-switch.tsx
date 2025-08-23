"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { useClienteStore, loadClienteFromStorage, Cliente } from "@/stores/cliente.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";

type ClientSwitchProps = {
  /** Opcional: força o clienteId atual (ex.: vindo da página) */
  clienteId?: string;
  /** Opcional: callback quando o cliente mudar */
  onChange?: (newClienteId: string) => void;
};

export function ClientSwitch({ clienteId, onChange }: ClientSwitchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ clienteId?: string }>();

  // clienteId da URL (ex.: /health/:clienteId/...)
  const urlClienteId = params?.clienteId;

  // Se vier por prop, ela prevalece; senão usa o da URL.
  const effectiveClienteId = clienteId ?? urlClienteId;

  const { current, setCurrent } = useClienteStore();
  const [search, setSearch] = useState("");

  const { data: options = [] } = useClients(search);

  // 1) Sincroniza store a partir do LocalStorage, apenas se ainda não houver current
  useEffect(() => {
    if (current?.id) return;
    const saved = loadClienteFromStorage();
    if (saved) setCurrent(saved);
  }, [current?.id, setCurrent]);

  // 2) Sincroniza store quando a prop/URL mudar e houver esse cliente na lista
  useEffect(() => {
    if (!effectiveClienteId) return;
    if (effectiveClienteId === current?.id) return;

    const found = options.find((o) => o.id === effectiveClienteId);
    if (found) setCurrent(found);
  }, [effectiveClienteId, current?.id, options, setCurrent]);

  const title = useMemo(() => current?.nome ?? "Selecionar cliente", [current]);

  const onChoose = (c: Cliente) => {
    setCurrent(c);
    onChange?.(c.id);

    if (!pathname) return;

    let next = pathname;

    // Se a rota já tem /health/:id, substitui apenas esse segmento, preservando o restante do caminho
    if (/^\/health\/[^/]+(\/|$)/.test(pathname)) {
      next = pathname.replace(/(^\/health\/)[^/]+/, `$1${c.id}`);
    } else if (pathname.startsWith("/health")) {
      // /health sem id -> insere o id
      next = pathname.replace("/health", `/health/${c.id}`);
    } else {
      // Fora de /health -> envia para a raiz de saúde do cliente
      next = `/health/${c.id}`;
    }

    router.push(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="max-w-[280px] truncate">
          {title}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="p-2">
          <Input
            placeholder="Buscar cliente por nome ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Command>
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
            <CommandGroup heading="Clientes">
              {options.map((c) => (
                <CommandItem key={c.id} onSelect={() => onChoose(c)}>
                  <div className="flex flex-col">
                    <span className="text-sm">{c.nome}</span>
                    <span className="text-xs text-muted-foreground">{c.cnpj ?? "—"}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
