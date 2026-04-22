"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  LuLayoutDashboard,
  LuTicket,
  LuListChecks,
  LuSparkles,
  LuCompass,
  LuLogOut,
  LuShieldCheck,
} from "react-icons/lu";

import { api } from "@/lib/api";

const NAV = [
  {
    label: "Workflow",
    items: [
      { href: "/", icon: LuTicket, title: "Pick tickets",
        hint: "Browse and select T3 tickets for analysis" },
      { href: "/analyses", icon: LuListChecks, title: "Analyses",
        hint: "Past and active runs" },
      { href: "/validate", icon: LuShieldCheck, title: "Validate tickets",
        hint: "Spot-check the classifier on a random sample" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  function handleLogout() {
    startSignOut(async () => {
      try {
        await api.logout();
      } catch {
        // Even if the server call fails, fall through to the redirect; the
        // proxy will send us to /login anyway once the cookie is gone.
      }
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="px-2 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={collapsed ? toggleSidebar : undefined}
            aria-label={collapsed ? "Expand sidebar" : "T3 Co-Pilot"}
            className={`grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-transform ${
              collapsed
                ? "cursor-pointer hover:scale-[1.04] hover:bg-primary/90"
                : "cursor-default"
            }`}
          >
            <LuSparkles className="size-4" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold leading-tight">
              AI Classifier
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Ticket intelligence for support
            </span>
          </div>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={item.hint}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup>
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/analyses")}
                  tooltip="Service dashboard"
                >
                  <Link href="/analyses">
                    <LuLayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/explore")}
                  tooltip="Filter tickets across all runs"
                >
                  <Link href="/explore">
                    <LuCompass />
                    <span>Explore tickets</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={signingOut}
              tooltip="Sign out"
            >
              <LuLogOut />
              <span>{signingOut ? "Signing out…" : "Sign out"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          <span>Zoho · T3 dept</span>
          <Badge variant="outline" className="text-[10px]">
            demo
          </Badge>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
