import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStats, getUser, logout, type SessionUser } from "@/lib/api";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

export function TopHeader() {
  const now = useClock();
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => setUser(getUser()), []);

  // Backend reachability drives the status pill.
  const health = useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const backendDown = health.isError;

  async function signOut() {
    await logout();
    await navigate({ to: "/login" });
  }

  const date = now
    ? now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";
  const time = now ? now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <header className="header-glow border-b border-border px-6 py-6 lg:px-9">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy lg:text-[34px]">
            Deco <span className="text-brand-blue">Vision</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-text-secondary">AI Camera Intelligence</p>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-4 text-xs font-medium text-text-secondary">
            <span className="flex items-center gap-2">
              {backendDown ? (
                <span className="h-2 w-2 rounded-full bg-pink" />
              ) : (
                <span className="live-dot" />
              )}
              {backendDown ? "Backend Unreachable" : "All Systems Operational"}
            </span>
            <span className="h-4 w-px bg-border" />
            <span>{date}</span>
            <span>{time}</span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-primary-foreground outline-none"
              >
                <User className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold text-navy">{user?.name ?? "Signed in"}</p>
                  {user?.email && (
                    <p className="text-xs font-normal text-text-secondary">{user.email}</p>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold leading-snug text-navy">
              Smarter Cameras.
              <br />
              Safer Spaces.
            </p>
            <span className="mt-2 block h-0.5 w-10 rounded-full bg-brand-blue" />
          </div>
        </div>
      </div>
    </header>
  );
}
