import { Maximize2 } from "lucide-react";
import { useState } from "react";
import type { Camera } from "@/lib/api";
import { useLiveCamera } from "@/hooks/use-live-camera";
import { CameraViewer } from "./CameraViewer";
import { recognizedName } from "@/lib/live";
import { LiveView } from "./LiveView";

export function CameraCard({ camera, index }: { camera: Camera; index?: number }) {
  const enabled = camera.is_configured && camera.live_feed_enabled !== 0;
  const live = useLiveCamera(camera.id, enabled);
  const { status, people } = live;
  const isLive = status === "live";
  const recognized = people.filter((p) => recognizedName(p)).length;
  const label = `Camera ${String(index ?? camera.id).padStart(2, "0")}`;
  const [open, setOpen] = useState(false);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-navy">
            {label} — {camera.name}
          </h3>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
          {isLive && <span className="live-dot" />}
          {isLive ? "Live" : status === "connecting" ? "Connecting…" : "Offline"}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Open ${camera.name}`}
        className="group relative mx-3 min-h-0 flex-1 cursor-zoom-in overflow-hidden rounded-xl bg-secondary text-left"
      >
        <LiveView {...live} enabled={enabled} label={`${label} live feed — ${camera.name}`} />
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="h-4 w-4" />
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 text-[11px] font-medium text-text-secondary">
        <span>
          People detected:{" "}
          <span className="font-semibold text-navy">{isLive ? people.length : "—"}</span>
        </span>
        <span>
          Recognized: <span className="font-semibold text-navy">{isLive ? recognized : "—"}</span>
        </span>
        <span>
          Status:{" "}
          <span className={`font-semibold ${isLive ? "text-live" : "text-text-secondary"}`}>
            {isLive ? "Live" : "Offline"}
          </span>
        </span>
      </div>

      {open && <CameraViewer camera={camera} onClose={() => setOpen(false)} />}
    </article>
  );
}
