"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  Command,
  FileText,
  FileSpreadsheet,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
  ShieldAlert,
  Tags,
  Users,
  Wallet,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/**
 * Helper para marcar como ativo via pathname.
 */
function useSidebarData() {
  const pathname = usePathname();

  const isActive = (url?: string) =>
    !!url && (pathname === url || pathname.startsWith(`${url}/`));

  const sectionActive = (urls: Array<string | undefined>) =>
    urls.some((u) => isActive(u));

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: isActive("/dashboard"),
      items: [],
    },

    // --- CRM / Cadastros ---
    {
      title: "CRM • Cadastros",
      url: "/clients",
      icon: Users,
      isActive: sectionActive([
        "/clients",
        "/contacts",
        "/companies",
        "/tags",
      ]),
      items: [
        { title: "Clientes", url: "/clients" },
        { title: "Contatos", url: "/contacts" },
        { title: "Empresas (PJ)", url: "/companies" },
        { title: "Tags", url: "/tags" },
      ],
    },

    // --- Saúde (beneficiários, faturas, conciliação) ---
    {
      title: "Saúde",
      url: "/health",
      icon: HeartPulse,
      isActive: sectionActive([
        "/health/beneficiaries",
        "/health/invoices",
        "/health/reconciliation",
      ]),
      items: [
        { title: "Beneficiários", url: "/health/beneficiaries" },
        { title: "Faturas", url: "/health/invoices" },
        { title: "Conciliação", url: "/health/reconciliation" },
      ],
    },

    // --- Apólices / Propostas ---
    {
      title: "Apólices",
      url: "/policies",
      icon: FileText,
      isActive: sectionActive(["/policies", "/quotes"]),
      items: [
        { title: "Apólices", url: "/policies" },
        { title: "Propostas & Cotações", url: "/quotes" },
      ],
    },

    // --- Sinistros ---
    {
      title: "Sinistros",
      url: "/claims",
      icon: ShieldAlert,
      isActive: isActive("/claims"),
      items: [
        { title: "Lista de sinistros", url: "/claims" },
        { title: "Abertura de sinistro", url: "/claims/new" },
      ],
    },

    // --- Financeiro (comissões, cobranças etc) ---
    {
      title: "Financeiro",
      url: "/finance",
      icon: Wallet,
      isActive: sectionActive([
        "/finance/billing",
        "/finance/payments",
        "/finance/commissions",
      ]),
      items: [
        { title: "Faturamento", url: "/finance/billing" },
        { title: "Pagamentos/Boletos", url: "/finance/payments" },
        { title: "Comissões", url: "/finance/commissions" },
      ],
    },

    // --- Relatórios ---
    {
      title: "Relatórios",
      url: "/reports",
      icon: BarChart3,
      isActive: sectionActive([
        "/reports/clients",
        "/reports/health",
        "/reports/finance",
      ]),
      items: [
        { title: "Clientes", url: "/reports/clients" },
        { title: "Saúde", url: "/reports/health" },
        { title: "Financeiro", url: "/reports/finance" },
      ],
    },

    // --- Administração / Configurações ---
    {
      title: "Administração",
      url: "/settings",
      icon: Settings2,
      isActive: sectionActive([
        "/settings",
        "/settings/users",
        "/settings/billing",
        "/settings/limits",
        "/settings/services",
        "/settings/branches",
        "/insurers", // <- para considerar "Seguradoras" ativo dentro da seção
      ]),
      items: [
        { title: "Configurações gerais", url: "/settings" },
        { title: "Usuários & Permissões", url: "/settings/users" },
        { title: "Cobrança", url: "/settings/billing" },
        { title: "Limites", url: "/settings/limits" },
        { title: "Serviços", url: "/settings/services" },
        { title: "Filiais", url: "/settings/branches" },
        { title: "Seguradoras", url: "/insurers" }, // <- novo item
      ],
    },
  ];

  const navSecondary = [
    { title: "Suporte", url: "/support", icon: LifeBuoy },
    { title: "Feedback", url: "/feedback", icon: FileSpreadsheet },
  ];

  const projects = [
    // Você pode usar isso como "Atalhos"
    { name: "Importar Beneficiários", url: "/health/beneficiaries/import", icon: Building2 },
    { name: "Importar Fatura", url: "/health/invoices/upload", icon: FileSpreadsheet },
    { name: "Gerenciar Tags", url: "/tags", icon: Tags },
  ];

  return { navMain, navSecondary, projects };
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { navMain, navSecondary, projects } = useSidebarData();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Harper</span>
                  <span className="truncate text-xs">Corretora • Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
        <NavSecondary className="mt-auto" items={navSecondary} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser
          user={{
            name: "Usuário",
            email: "user@example.com",
            avatar: "/avatars/user.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
