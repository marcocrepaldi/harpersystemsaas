'use client';

import * as React from 'react';
import { Protected } from '@/components/auth/protected';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import ClientForm from '../_components/client-form';

export default function NewClientPage(): React.ReactElement {
  return (
    <Protected>
      <SidebarProvider
        /* CSS custom properties para o layout do sidebar/header */
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
          <div className="flex-1 p-4 md:p-6">
            <ClientForm mode="create" title="Cadastro de Cliente" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Protected>
  );
}
