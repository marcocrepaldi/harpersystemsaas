'use client';

import * as React from 'react';
import { Suspense, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import DocumentUpload from './_components/document-upload';
import DocumentTable from './_components/document-table';
import type { DocumentFromApi } from '@/types/document';

function PageInner(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();

  // 🔹 Pega o clientId direto de params.id
  const clientId =
    params?.id ||
    (typeof window !== 'undefined'
      ? window.location.pathname.split('/').filter(Boolean)[1]
      : '');

  // 🔹 Log para debug
  console.log('[DocumentsPage] Params:', params);
  console.log('[DocumentsPage] clientId resolvido:', clientId);

  const qs = useMemo(
    () => (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
    [searchParams],
  );

  const [refreshKey, setRefreshKey] = useState(0);

  function handleUploaded(_doc: DocumentFromApi) {
    setRefreshKey((k) => k + 1);
  }

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
                  <BreadcrumbLink href={`/clients${qs}`}>Clientes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href={`/clients/${encodeURIComponent(clientId)}${qs}`}>
                    Detalhe
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Documentos</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex gap-2 px-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/clients/${encodeURIComponent(clientId)}${qs}`)}
            >
              Voltar
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="rounded-xl bg-muted/50 p-6">
            <div className="mb-4 text-base font-medium">Enviar documento</div>
            <DocumentUpload clientId={clientId} onUploaded={handleUploaded} />
          </div>

          <div className="rounded-xl bg-muted/50 p-6">
            <div className="mb-4 text-base font-medium">Documentos</div>
            <DocumentTable clientId={clientId} refreshKey={refreshKey} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DocumentsPage(): React.ReactElement {
  return (
    <Suspense
      fallback={
        <div className="p-4">
          <Skeleton className="mb-3 h-6 w-48" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <PageInner />
    </Suspense>
  );
}
