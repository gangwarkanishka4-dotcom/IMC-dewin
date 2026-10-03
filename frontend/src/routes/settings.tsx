import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gauge, LogOut, Server, Settings as SettingsIcon, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/dewin/PageShell";
import { Panel, QueryState } from "@/components/dewin/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BASE_URL,
  getSettings,
  getStats,
  getUser,
  logout,
  updateSettings,
  type SessionUser,
} from "@/lib/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/settings")({
  head: () =>
    pageMeta("Settings — Deco Vision", "Configure Deco Vision preferences and integrations."),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const settings = useQuery({ queryKey: ["settings"], queryFn: getSettings });
  const stats = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const [fps, setFps] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => setUser(getUser()), []);
  useEffect(() => {
    if (settings.data) setFps(String(settings.data.detection_fps));
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => updateSettings({ detection_fps: Number(fps) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
  const fpsValid = Number(fps) > 0 && Number(fps) <= 30;

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel icon={Gauge} title="Detection">
          <QueryState isLoading={settings.isLoading} error={settings.error} />
          {settings.data && (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="fps">Detection rate (frames per second)</Label>
                <Input
                  id="fps"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  value={fps}
                  onChange={(e) => setFps(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button type="submit" disabled={!fpsValid || save.isPending}>
                Save
              </Button>
              {save.isSuccess && <span className="text-sm font-medium text-live">Saved</span>}
              {save.error && (
                <span className="text-sm font-medium text-pink">{save.error.message}</span>
              )}
            </form>
          )}
        </Panel>

        <Panel icon={User} title="Account">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-navy">{user?.name ?? "—"}</p>
              <p className="text-sm text-text-secondary">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
                await navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </Panel>

        <Panel icon={Server} title="Backend connection" className="xl:col-span-2">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                API
              </dt>
              <dd className="font-mono text-navy">{BASE_URL}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Status
              </dt>
              <dd className={stats.isError ? "font-semibold text-pink" : "font-semibold text-live"}>
                {stats.isLoading ? "Checking…" : stats.isError ? "Unreachable" : "Connected"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Cameras
              </dt>
              <dd className="font-semibold text-navy">
                {stats.data
                  ? `${stats.data.active_cameras} active of ${stats.data.total_cameras}`
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
            <SettingsIcon className="h-3.5 w-3.5" /> Set the API address with VITE_API_BASE_URL in
            frontend/.env.
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
