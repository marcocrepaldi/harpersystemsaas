'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Protected } from '@/components/auth/protected';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

import { PlusCircle, RefreshCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

type HealthPlan = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
};

export default function PlansListPage() {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE'>('ALL');

  const { data, isFetching, isError, error, refetch } = useQuery<HealthPlan[]>({
    queryKey: ['health-plans'],
    queryFn: () => apiFetch<HealthPlan[]>('/health/plans'),
    staleTime: 10_000,
  });

  const filtered = React.useMemo(() => {
    const items = data ?? [];
    const q = search.trim().toLowerCase();
    return items.filter(p => {
      const statusOk = statusFilter === 'ALL' ? true : p.isActive;
      const textOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q);
      return statusOk && textOk;
    });
  }, [data, search, statusFilter]);

  return (
    <Protected>
      <SidebarProvider
        style={
          {
            '--sidebar-width': 'calc(var(--spacing) * 72)',
            '--header-height': 'calc(var(--spacing) * 12)',
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />

          <div className="px-4 pt-2 md:px-6 md:pt-4">
            {/* Breadcrumb + Ações */}
            <div className="mb-4 flex items-center justify-between">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/health">Saúde</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Planos</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Atualizar
                </Button>
                <Button asChild size="sm">
                  <Link href="/health/plans/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo plano
                  </Link>
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Planos cadastrados</CardTitle>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-[320px]">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou slug..."
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v: 'ALL' | 'ACTIVE') => setStatusFilter(v)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Status (Todos)</SelectItem>
                      <SelectItem value="ACTIVE">Somente ativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {isFetching && !data ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : isError ? (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">Erro ao carregar planos.</p>
                    <p className="text-xs text-muted-foreground break-all">{errorMessage(error)}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                            <TableCell>
                              {p.isActive ? (
                                <Badge variant="default">Ativo</Badge>
                              ) : (
                                <Badge variant="secondary">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="inline-flex gap-2">
                                {/* Se quiser detalhar depois: aliases, preços, etc. */}
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/health/plans/${p.id}`}>Ver</Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                              Nenhum plano encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
