"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export type SecondaryItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  /** Abre em nova aba e mostra indicador externo */
  external?: boolean;
  /** Regra de match para estado ativo */
  match?: "exact" | "startsWith";
  /** Badge opcional (ex.: contadores) */
  badge?: string | number;
  /** Callback opcional ao clicar */
  onClick?: () => void;
};

export function NavSecondary(
  props: {
    items: SecondaryItem[];
  } & React.ComponentPropsWithoutRef<typeof SidebarGroup>,
) {
  const { items, ...rest } = props;
  const pathname = usePathname();

  const isActive = React.useCallback(
    (item: SecondaryItem) => {
      const rule = item.match ?? "exact";
      return rule === "startsWith"
        ? pathname.startsWith(item.url)
        : pathname === item.url;
    },
    [pathname],
  );

  return (
    <SidebarGroup {...rest}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon ?? ExternalLink;

            const inner = (
              <>
                <Icon />
                <span className="inline-flex items-center gap-2">
                  {item.title}
                  {item.badge !== undefined && item.badge !== null && (
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] leading-none">
                      {item.badge}
                    </span>
                  )}
                </span>
                {item.external && (
                  <ExternalLink
                    className="ml-auto size-3.5 opacity-60"
                    aria-hidden
                  />
                )}
              </>
            );

            return (
              <SidebarMenuItem key={`${item.title}-${item.url}`}>
                {item.external ? (
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    isActive={active}
                    data-active={active || undefined}
                    className={active ? "data-[active=true]:bg-accent" : undefined}
                  >
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-current={active ? "page" : undefined}
                      onClick={item.onClick}
                    >
                      {inner}
                    </a>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    isActive={active}
                    data-active={active || undefined}
                    className={active ? "data-[active=true]:bg-accent" : undefined}
                  >
                    <Link
                      href={item.url}
                      aria-current={active ? "page" : undefined}
                      onClick={item.onClick}
                    >
                      {inner}
                    </Link>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
