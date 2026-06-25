import { ReactElement, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Film, Tags, Sliders, Users, LogOut, ExternalLink, Timer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SPEED_LABELS,
  TooltipSpeed,
  useTooltipDelay,
} from "@/hooks/use-tooltip-delay";

/**
 * Wraps a sidebar control in a themed tooltip that only appears when the
 * sidebar is in its collapsed (mini) state — i.e. below the `md` breakpoint.
 * Radix tooltips show on both pointer hover AND keyboard focus, so this
 * is fully accessible for keyboard users.
 */
function MiniTip({ label, children }: { label: string; children: ReactElement }) {
  const { delay } = useTooltipDelay();
  return (
    <Tooltip delayDuration={delay}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="md:hidden bg-popover/95 backdrop-blur border-border text-foreground font-medium"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

const nav = [
  { to: "/cms/movies", label: "Movies", icon: Film },
  { to: "/cms/categories", label: "Categories", icon: Tags },
  { to: "/cms/rails", label: "Rails", icon: Sliders },
  { to: "/cms/users", label: "Users", icon: Users, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { speed, setSpeed } = useTooltipDelay();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen glass border-r border-border flex flex-col z-40",
          "w-16 md:w-64 transition-[width] duration-200",
        )}
      >
        <div
          className={cn(
            "border-b border-border flex items-center",
            "p-3 md:p-6 md:gap-3 justify-center md:justify-start",
          )}
        >
          {/* Mark on small screens */}
          <Logo variant="mark" className="h-8 w-8 md:hidden select-none" />
          {/* Wordmark on md+ */}
          <Logo className="hidden md:block h-7 md:h-8 lg:h-9 w-auto select-none" />
          <span className="hidden md:inline text-xs text-muted-foreground border-l border-border pl-3 leading-tight">
            CMS<br />v1.0
          </span>
        </div>

        <nav className="flex-1 p-2 md:p-3 space-y-1">
          {nav.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <MiniTip key={item.to} label={item.label}>
                <NavLink
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
                    "justify-center md:justify-start px-3 md:px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "gradient-brand text-primary-foreground hover:text-primary-foreground shadow-glow",
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium hidden md:inline">{item.label}</span>
                </NavLink>
              </MiniTip>
            );
          })}
        </nav>

        <div className="p-2 md:p-4 border-t border-border">
          <MiniTip label="View SmileFlex Site">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="w-full mb-2 md:mb-3 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary-glow text-sm font-medium flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">View SmileFlex Site</span>
            </a>
          </MiniTip>
          <div className="flex items-center gap-3 mt-2 mb-2 md:mb-3 justify-center md:justify-start">
            <MiniTip label={`${user?.email ?? ""} · ${user?.role ?? ""}`}>
              <div
                tabIndex={0}
                aria-label={`${user?.email ?? ""} (${user?.role ?? ""})`}
                className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center font-semibold text-primary-foreground shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-default"
              >
                {user?.email[0].toUpperCase()}
              </div>
            </MiniTip>
            <div className="flex-1 min-w-0 hidden md:block">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-primary-glow capitalize">{user?.role}</p>
            </div>
          </div>
          <MiniTip label="Sign Out">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-foreground text-sm font-medium flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </MiniTip>
          <DropdownMenu>
            <MiniTip label={`Tooltip speed: ${SPEED_LABELS[speed]}`}>
              <DropdownMenuTrigger
                className="mt-2 w-full py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 text-xs font-medium flex items-center justify-center md:justify-start gap-2 px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Tooltip speed: ${SPEED_LABELS[speed]}`}
              >
                <Timer className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">Tooltip speed</span>
                <span className="hidden md:inline ml-auto text-primary-glow">
                  {SPEED_LABELS[speed]}
                </span>
              </DropdownMenuTrigger>
            </MiniTip>
            <DropdownMenuContent side="right" align="end" className="w-48">
              <DropdownMenuLabel>Tooltip speed</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={speed}
                onValueChange={(v) => setSpeed(v as TooltipSpeed)}
              >
                {(Object.keys(SPEED_LABELS) as TooltipSpeed[]).map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {SPEED_LABELS[s]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="ml-16 md:ml-64 flex-1 p-4 md:p-8 animate-fade-in transition-[margin] duration-200">
        {children}
      </main>
    </div>
  );
}
