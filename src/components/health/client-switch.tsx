"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useClients } from "@/hooks/useClients";
import { useClienteStore, loadClienteFromStorage, Cliente } from "@/stores/cliente.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";

export function ClientSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ clienteId?: string }>();
  const urlClienteId = params?.clienteId;
  const { current, setCurrent } = useClienteStore();
  const [search, setSearch] = useState("");

  const { data: options = [] } = useClients(search);

  // sincronizar com URL/LocalStorage
  useEffect(() => {
    if (current?.id) return;
    const saved = loadClienteFromStorage();
    if (saved) setCurrent(saved);
  }, [current?.id, setCurrent]);

  useEffect(() => {
    if (!urlClienteId && current?.id) return;
    if (urlClienteId && urlClienteId !== current?.id) {
      const found = options.find((o) => o.id === urlClienteId);
      if (found) setCurrent(found);
    }
  }, [urlClienteId, current?.id, options, setCurrent]);

  const title = useMemo(() => current?.nome ?? "Selecionar cliente", [current]);

  const onChoose = (c: Cliente) => {
    setCurrent(c);
    // rebasear a rota atual, substituindo o clienteId na URL (se existir) ou inserindo
    if (!pathname) return;
    let next = pathname;
    if (urlClienteId) {
      next = pathname.replace(`/health/${urlClienteId}`, `/health/${c.id}`);
    } else if (pathname.startsWith("/health")) {
      next = pathname.replace("/health", `/health/${c.id}`);
    } else {
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
