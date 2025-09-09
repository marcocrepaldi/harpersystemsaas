'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

// UI/Layout
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ClientSwitch } from '@/components/health/client-switch';

// Conteúdo da página
import ReconciliationBoard from './reconciliation-board';

// ---------------- Insurer Picker (inline, sem dependências externas) ----------------
type Insurer = {
  id: string;
  tradeName: string;
  legalName?: string | null;
  lines?: string[]; // ["HEALTH", ...]
  isActive?: boolean;
};

function InsurerPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentInsurerId = searchParams.get('insurerId') ?? '';

  const [list, setList] = React.useState<Insurer[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/insurers?line=HEALTH&isActive=true&limit=1000&sortBy=tradeName&sortOrder=asc`,
          { cache: 'no-store' },
        );
        if (!res.ok) throw new Error('Falha ao carregar operadoras');
        const data = await res.json();
        // API de list retorna { items, page, limit, total }
        const items: Insurer[] = (data?.items ?? []).filter(
          (it: Insurer) => Array.isArray(it?.lines) ? it.lines!.includes('HEALTH') : true,
        );
        if (!cancelled) setList(items);
      } catch (_err) {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (value: string) => {
    // Atualiza a querystring preservando os demais parâmetros (ex.: mes)
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('insurerId', value);
    else params.delete('insurerId');
    const qs = params.toString();
    router.replace(`?${qs}`, { scroll: false });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="insurerPicker" className="text-sm text-muted-foreground">
        Operadora
      </label>
      <select
        id="insurerPicker"
        value={currentInsurerId}
        onChange={(e) => handleChange(e.target.value)}
        className="h-9 rounded-md border px-2 text-sm"
        disabled={loading}
      >
        <option value="">Todas</option>
        {list.map((it) => (
          <option key={it.id} value={it.id}>
            {it.tradeName || it.legalName || it.id}
          </option>
        ))}
      </select>
    </div>
  );
}

// -----------------------------------------------------------------------------------

function Page() {
  const { clienteId } = useParams<{ clienteId: string }>();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/health">Rota de Saúde</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/health/${clienteId}`}>
                    Cliente
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Conciliação</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Filtros à direita */}
          <div className="ml-auto flex items-center gap-3 pr-4">
            <InsurerPicker />
            <ClientSwitch />
          </div>
        </header>

        <div className="flex-1 p-4 pt-0">
          {/* O ReconciliationBoard continuará lendo insurerId de useSearchParams */}
          <ReconciliationBoard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Page;
