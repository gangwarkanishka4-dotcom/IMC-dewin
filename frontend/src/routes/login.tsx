import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/deco-vision-logo.png";
import { getToken, login } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Deco Vision" },
      { name: "description", content: "Sign in to Deco Vision AI Camera Intelligence." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in: straight to the dashboard.
  useEffect(() => {
    if (getToken()) void navigate({ to: "/" });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim());
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the Deco Vision backend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="header-glow flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-card"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img
            src={logo}
            alt="Deco Vision logo"
            className="h-12 w-12 rounded-xl object-contain"
          />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-navy">
              Deco <span className="text-brand-blue">Vision</span>
            </h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">AI Camera Intelligence</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>

        {error && <p className="mt-3 text-sm font-medium text-pink">{error}</p>}

        <Button type="submit" className="mt-6 w-full" disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}
