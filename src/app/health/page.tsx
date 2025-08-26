"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

// Layout
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";

// UI
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

// ---------- Tipos ----------
type PageResult<T> = { items: T[]; page: number; limit: number; total: number };
type ClientRow = { id: string; name: string; document?: string | null };

// ---------- Wrapper por conta do useSearchParams ----------
export default function HealthSelectClientPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <Skeleton className="h-6 w-48 mb-3" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <HealthSelectClientPageInner />
    </Suspense>
  );
}

function HealthSelectClientPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Query params
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "10");
  const search = searchParams.get("search") ?? "";

  // Busca (estado controlado)
  const [searchText, setSearchText] = React.useState(search);

  // ✅ Filtra apenas clientes com serviço de saúde
  const { data, isFetching, isError, error, refetch } = useQuery<PageResult<ClientRow>>({
    queryKey: ["health-select-client", { page, limit, search }],
    queryFn: async () => {
      const res = await apiFetch<PageResult<ClientRow> | ClientRow[]>("/clients", {
        query: {
          page,
          limit,
          search: search || undefined,
          service: "HEALTH",
        },
      });
      if (Array.isArray(res)) {
        return { items: res, page, limit, total: res.length };
      }
      if (res && Array.isArray((res as PageResult<ClientRow>).items)) {
        return res as PageResult<ClientRow>;
      }
      throw new Error("Resposta inválida da API de clientes.");
    },
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const items: ClientRow[] = React.useMemo(() => data?.items ?? [], [data]);
  const currentPage = data?.page ?? page;
  const currentLimit = data?.limit ?? limit;
  const total = data?.total ?? items.length;
  const totalPages = Math.max(1, Math.ceil((total || 1) / (currentLimit || 10)));

  // Helpers de navegação/params
  const pushParams = (updates: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") p.delete(k);
      else p.set(k, String(v));
    });
    router.push(`?${p.toString()}`);
  };
  const setPage = (next: number) => pushParams({ page: Math.max(1, next) });
  const onSubmitSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushParams({ search: searchText || undefined, page: 1 });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Rota de Saúde · Selecionar Cliente</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col p-4 pt-0">
          <div className="bg-muted/50 flex-1 rounded-xl p-6">
            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <form onSubmit={onSubmitSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-[260px]"
                    placeholder="Buscar por nome ou CNPJ..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">
                  Buscar
                </Button>
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSearchText("");
                      pushParams({ search: undefined, page: 1 });
                    }}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Limpar busca</span>
                  </Button>
                )}
              </form>

              <div className="flex items-center gap-2">
                <Button asChild>
                  <Link href="/clients/new">Novo Cliente</Link>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Selecione um cliente com apólice de saúde
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isFetching && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : isError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">Erro ao carregar clientes.</p>
                    <p className="text-xs text-muted-foreground break-all">{errorMessage(error)}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : items.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Nenhum cliente com apólice de saúde foi encontrado.
                    </p>
                    <Button asChild size="sm">
                      <Link href="/clients/new">Cadastrar cliente</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60%]">Nome</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((c) => (
                            <TableRow
                              key={c.id}
                              className="cursor-pointer hover:bg-accent/50 even:bg-muted/30"
                              onClick={() => router.push(`/health/${encodeURIComponent(c.id)}`)}
                            >
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell>{c.document ?? "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/health/${encodeURIComponent(c.id)}`);
                                  }}
                                >
                                  Acessar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
