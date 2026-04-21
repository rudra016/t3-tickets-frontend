import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  const { isMobile } = useSidebar();
  // On desktop the logo in the sidebar doubles as the expand trigger when
  // collapsed, so the page header only needs its own trigger on mobile
  // (where the sidebar is a slide-in sheet).
  const showTrigger = isMobile;
  return (
    <header className="flex flex-col gap-3 rounded-t-xl border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {showTrigger ? (
          <>
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />
          </>
        ) : null}
        <div className="flex flex-1 items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
