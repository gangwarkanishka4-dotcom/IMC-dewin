import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Cctv, Video } from "lucide-react";
import { PageShell } from "@/components/dewin/PageShell";
import { CameraCard } from "@/components/dewin/CameraCard";
import { EmptyState, QueryState } from "@/components/dewin/Panel";
import { getCameras } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Deco Vision — Live AI Camera Monitoring" },
      {
        name: "description",
        content:
          "Deco Vision dashboard: four live AI camera feeds with person detection and face recognition overlays.",
      },
      { property: "og:title", content: "Deco Vision — Live AI Camera Monitoring" },
      {
        property: "og:description",
        content: "Monitor four live AI camera feeds with real-time detection overlays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["cameras"], queryFn: getCameras });
  // The dashboard's 2x2 grid shows the first four live-enabled cameras;
  // Vision (/live-analytics) shows all of them.
  const cameras = (data ?? []).filter((c) => c.live_feed_enabled !== 0).slice(0, 4);

  return (
    <PageShell>
      <section className="flex min-h-[calc(100vh-15rem)] flex-col rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue text-primary-foreground">
              <Video className="h-[18px] w-[18px]" />
            </span>
            <h2 className="text-lg font-bold text-navy sm:text-xl">Live AI Analytics</h2>
          </div>
          <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
            <span className="live-dot" />
            Live
          </span>
        </div>

        <QueryState isLoading={isLoading} error={error} />
        {data && cameras.length === 0 && (
          <EmptyState icon={Cctv} title="No live cameras yet">
            Add a camera with live feed enabled in Camera Management.
          </EmptyState>
        )}
        <div className="grid flex-1 grid-cols-1 gap-5 md:grid-cols-2 md:grid-rows-2">
          {cameras.map((camera, i) => (
            <CameraCard key={camera.id} camera={camera} index={i + 1} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
