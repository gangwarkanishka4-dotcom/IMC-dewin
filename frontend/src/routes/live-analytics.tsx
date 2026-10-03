import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Cctv, Video } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/dewin/PageShell";
import { CameraCard } from "@/components/dewin/CameraCard";
import { EmptyState, Panel, QueryState } from "@/components/dewin/Panel";
import { getCameras } from "@/lib/api";

export const Route = createFileRoute("/live-analytics")({
  head: () => ({
    meta: [
      { title: "Live AI Analytics — Deco Vision" },
      {
        name: "description",
        content: "Full-screen live AI analytics across all connected cameras.",
      },
      { property: "og:title", content: "Live AI Analytics — Deco Vision" },
      {
        property: "og:description",
        content: "Full-screen live AI analytics across all connected cameras.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { data, isLoading, error } = useQuery({ queryKey: ["cameras"], queryFn: getCameras });
  const [site, setSite] = useState("All sites");
  const cameras = data ?? [];
  const sites = ["All sites", ...new Set(cameras.map((c) => c.site))];
  const shown = cameras.filter((c) => site === "All sites" || c.site === site);

  return (
    <PageShell>
      <Panel
        icon={Video}
        title="Live AI Analytics"
        actions={
          sites.length > 2 && (
            <div className="flex flex-wrap gap-1.5">
              {sites.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSite(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    s === site
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-text-secondary hover:text-navy"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )
        }
      >
        <QueryState isLoading={isLoading} error={error} />
        {data && shown.length === 0 && (
          <EmptyState icon={Cctv} title="No cameras">
            Add cameras in Camera Management to see them live here.
          </EmptyState>
        )}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((camera, i) => (
            <CameraCard key={camera.id} camera={camera} index={i + 1} />
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
