import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { getToken } from "@/lib/api";
import { AppSidebar } from "./AppSidebar";
import { TopHeader } from "./TopHeader";

/** Every page except /login is behind the backend session: no token, no page.
 * Checked after mount — the session lives in localStorage, which the
 * server-side render can't see. */
function useRequireSession() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    if (getToken()) setAuthed(true);
    else void navigate({ to: "/login" });
  }, [navigate]);
  return authed;
}

export function PageShell({ children }: { children: ReactNode }) {
  const authed = useRequireSession();
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-9">{authed ? children : null}</main>
        <footer className="border-t border-border bg-card px-6 py-4 text-xs font-medium text-text-secondary lg:px-9">
          <span className="font-semibold text-brand-blue">Deco Vision</span>
          <span className="mx-2 text-border">|</span>
          AI powered analytics for a safer, smarter and more connected world.
        </footer>
      </div>
    </div>
  );
}
