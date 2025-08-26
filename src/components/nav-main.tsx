"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavSubItem = {
  title: string;
  url: string;
};

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean; // permite forçar ativo via prop
  items?: NavSubItem[];
  exact?: boolean; // se true, ativa só em match exato
};

export function NavMain({
  items,
  label = "Menu",
}: {
  items: NavItem[];
  label?: string;
}) {
  const pathname = usePathname();

  const matches = React.useCallback(
    (url?: string, exact = false) => {
      if (!url) return false;
      if (exact) return pathname === url;
      return pathname === url || pathname.startsWith(`${url}/`);
    },
    [pathname],
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const subMatches =
            item.items?.some((s) => matches(s.url, false)) ?? false;

          // ✅ Parênteses para não misturar ?? e ||
          const active =
            item.isActive ?? (matches(item.url, !!item.exact) || subMatches);

          return (
            <Collapsible key={item.url || item.title} asChild defaultOpen={!!active}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={!!active}
                  className={active ? "data-[active=true]:bg-accent" : undefined}
                  data-active={active || undefined}
                >
                  <Link href={item.url} aria-current={active ? "page" : undefined}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>

                {item.items?.length ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction
                        className="data-[state=open]:rotate-90"
                        aria-label={`Alternar ${item.title}`}
                      >
                        <ChevronRight />
                        <span className="sr-only">Toggle</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => {
                          const subActive = matches(sub.url, false);
                          return (
                            <SidebarMenuSubItem key={sub.url || sub.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={subActive}
                                className={subActive ? "data-[active=true]:bg-accent" : undefined}
                                data-active={subActive || undefined}
                              >
                                <Link
                                  href={sub.url}
                                  aria-current={subActive ? "page" : undefined}
                                >
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                ) : null}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
