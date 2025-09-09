'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientSwitch } from '@/components/health/client-switch';
import {
  Users,
  FileSpreadsheet,
  ClipboardList,
  Wallet,
  ArrowRight,
  History,
  Shield,
} from 'lucide-react';

/* ========================= Tipos ========================= */

type ReconResume = {
  ok: boolean;
  mesReferencia: string; // 'YYYY-MM-01'
  totals: {
    faturaSum: string | number; // pode vir "R$ 0,00" ou número
    ativosCount: number;
    mismatched: number;
    duplicates: number;
  };
  closure?: { status: 'OPEN' | 'CLOSED'; totalFatura?: string | number; closedAt?: string; notes?: string | null };
};

/* ========================= Utils ========================= */

const ymNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const NF = new Intl.NumberFormat('pt-BR');
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** tenta formatar como BRL mesmo que venha string "1234,56" ou "R$ 1.234,56" */
function formatCurrencyLoose(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return BRL.format(v);

  const s = String(v).trim();
  if (s.startsWith('R$')) return s; // já formatado
  // tenta normalizar "1.234,56" -> 1234.56
  const numeric = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numeric) ? BRL.format(numeric) : s;
}

function formatNumber(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number' && Number.isFinite(v)) return NF.format(v);
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? NF.format(n) : String(v);
}

/* ========================= Página ========================= */

export default function HealthClienteHome() {
  const { clienteId } = useParams<{ clienteId: string }>();

  // faturamento sempre com o ano atual (from/to válidos)
  const now = new Date();
  const year = now.getFullYear();
  const faturamentoHref = {
    pathname: `/health/${clienteId}/faturamento`,
    query: { from: `${year}-01`, to: `${year}-12` },
  };

  // visão rápida do mês atual
  const currentYM = ymNow();
  const { data, isLoading } = useQuery<ReconResume>({
    queryKey: ['recon.home.resume', clienteId, currentYM],
    queryFn: () =>
      apiFetch<ReconResume>(`/clients/${clienteId}/reconciliation`, {
        query: { mes: currentYM },
      }),
    staleTime: 10_000,
  });

  const status = data?.closure?.status ?? 'OPEN';
  const closedLabel =
    data?.closure?.closedAt ? new Date(data.closure.closedAt).toLocaleString('pt-BR') : undefined;

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
                <BreadcrumbItem>
                  <BreadcrumbLink href="/health">Rota de Saúde</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Cliente: {clienteId}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto pr-4">
            <ClientSwitch />
          </div>
        </header>

        <div className="flex-1 p-4 pt-0">
          <div className="rounded-xl border bg-background p-6">
            {/* Header + ação */}
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-semibold">Visão geral</h1>
                <p className="text-sm text-muted-foreground">
                  Referência atual: <span className="font-medium">{currentYM}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={faturamentoHref} prefetch={false}>
                  <Button variant="default">
                    <History className="mr-2 h-4 w-4" />
                    Ver faturamento do ano
                  </Button>
                </Link>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                title="Vidas ativas"
                icon={<Users className="h-4 w-4" />}
                loading={isLoading}
                value={data?.totals.ativosCount}
                format="number"
                sub={
                  isLoading ? (
                    <Skeleton className="h-4 w-40" />
                  ) : (
                    <span>
                      Divergências: <b>{formatNumber(data?.totals.mismatched)}</b> • Duplicados:{' '}
                      <b>{formatNumber(data?.totals.duplicates)}</b>
                    </span>
                  )
                }
              />

              <StatCard
                title="Soma da fatura (mês)"
                icon={<Wallet className="h-4 w-4" />}
                loading={isLoading}
                value={data?.totals.faturaSum}
                format="currency"
                sub={isLoading ? <Skeleton className="h-4 w-24" /> : 'Conforme importado'}
              />

              <Card className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Status do mês</span>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    <Badge variant={status === 'CLOSED' ? 'default' : 'secondary'}>
                      {status === 'CLOSED' ? 'Fechado' : 'Aberto'}
                    </Badge>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {status === 'CLOSED' && closedLabel ? `Fechado em ${closedLabel}` : '—'}
                  </div>
                  <div className="mt-3">
                    <Link
                      href={`/health/${clienteId}/reconciliation?mes=${currentYM}`}
                      prefetch={false}
                      className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                      Ir para conciliação
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ações principais */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <QuickCard
                href={`/health/${clienteId}/beneficiaries`}
                icon={<Users className="h-4 w-4" />}
                title="Beneficiários"
                desc="Lista hierárquica (Titular → Dependentes)."
              />
              <QuickCard
                href={`/health/${clienteId}/import`}
                icon={<FileSpreadsheet className="h-4 w-4" />}
                title="Importar Fatura"
                desc="Upload CSV/XLSX e prévia de conciliação."
              />
              <QuickCard
                href={`/health/${clienteId}/reconciliation`}
                icon={<ClipboardList className="h-4 w-4" />}
                title="Conciliação"
                desc="Divergências, a mais e a menos."
              />
              <QuickCard
                href={`/health/${clienteId}/plans/new`}
                icon={<Wallet className="h-4 w-4" />}
                title="Cadastrar Plano"
                desc="Crie um novo plano para o cliente."
              />
              {/* NOVO: Seguradora & Regras */}
              <QuickCard
                href={`/health/${clienteId}/insurer-billing-rules`}
                icon={<Shield className="h-4 w-4" />}
                title="Seguradora & Regras"
                desc="Políticas de faturamento por plano/faixa."
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/* ===================== StatCard (ajustado) ===================== */

function StatCard({
  title,
  icon,
  value,
  format = 'plain',
  sub,
  loading = false,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  /** valor pode vir numérico ou string do backend */
  value: number | string | null | undefined;
  /** como exibir o valor principal */
  format?: 'plain' | 'number' | 'currency';
  /** linha de apoio (baixo) */
  sub?: React.ReactNode;
  /** mostra skeleton no valor e sub */
  loading?: boolean;
  /** opcional: torna o card clicável */
  href?: string;
}) {
  const content = (
    <Card className="overflow-hidden transition hover:shadow-sm">
      <CardContent className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{title}</span>
          <div className="rounded-md bg-muted p-2">{icon}</div>
        </div>
        <div className="text-2xl font-semibold">
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : format === 'currency' ? (
            formatCurrencyLoose(value as any)
          ) : format === 'number' ? (
            formatNumber(value as any)
          ) : value == null || value === '' ? (
            '—'
          ) : (
            String(value)
          )}
        </div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} prefetch={false} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

/* ===================== QuickCard ===================== */

function QuickCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string | { pathname: string; query?: Record<string, string> };
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} prefetch={false} className="block">
      <Card className="h-full transition hover:shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="rounded-md bg-muted p-2">{icon}</span>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
      </Card>
    </Link>
  );
}
