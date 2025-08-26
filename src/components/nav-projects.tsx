"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  type LucideIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export type ProjectLink = {
  name: string;
  url: string;
  icon?: LucideIcon;
  badge?: string | number;
  tooltip?: string;
};

export function NavProjects({
  projects,
  title = "Projetos",
  moreUrl,
  onView,
  onShare,
  onDelete,
}: {
  projects: ProjectLink[];
  title?: string;
  /** Link opcional para “ver mais” */
  moreUrl?: string;
  /** Callbacks opcionais para o menu de contexto */
  onView?: (p: ProjectLink) => void;
  onShare?: (p: ProjectLink) => void;
  onDelete?: (p: ProjectLink) => void;
}) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = React.useCallback(
    (url: string) => pathname === url || pathname.startsWith(`${url}/`),
    [pathname],
  );

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{title}</SidebarGroupLabel>

      <SidebarMenu>
        {projects.map((item) => {
          const Icon = item.icon ?? Folder;
          const active = isActive(item.url);

          return (
            <SidebarMenuItem key={item.url || item.name}>
              <SidebarMenuButton
                asChild
                tooltip={item.tooltip ?? item.name}
                isActive={active}
                data-active={active || undefined}
                className={active ? "data-[active=true]:bg-accent" : undefined}
              >
                <Link href={item.url} aria-current={active ? "page" : undefined}>
                  <Icon />
                  <span className="inline-flex items-center gap-2">
                    {item.name}
                    {item.badge !== undefined && item.badge !== null && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                        {item.badge}
                      </span>
                    )}
                  </span>
                </Link>
              </SidebarMenuButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover aria-label={`Ações de ${item.name}`}>
                    <MoreHorizontal />
                    <span className="sr-only">Mais</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  className="w-48"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem
                    onClick={() =>
                      onView ? onView(item) : router.push(item.url)
                    }
                  >
                    <Folder className="text-muted-foreground" />
                    <span>Ver</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => onShare?.(item)}>
                    <Share className="text-muted-foreground" />
                    <span>Compartilhar</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete?.(item)}
                  >
                    <Trash2 className="text-muted-foreground" />
                    <span>Excluir</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}

        {moreUrl && (
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={moreUrl}>
                <MoreHorizontal />
                <span>Ver mais</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
