import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Camera } from "@/lib/api";
import { useLiveCamera } from "@/hooks/use-live-camera";
import { recognizedName } from "@/lib/live";
import { LiveView } from "./LiveView";

function timestamp(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Full-size live view of one camera. Opens its own stream connection, so the
 * small card keeps playing underneath. */
export function CameraViewer({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const enabled = camera.is_configured && camera.live_feed_enabled !== 0;
  const live = useLiveCamera(camera.id, enabled);
  const isLive = live.status === "live";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const recognized = live.people.filter((p) => recognizedName(p)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-navy">{camera.name}</DialogTitle>
          <DialogDescription>
            {camera.site} · {camera.cam_code || `CAM-${camera.id}`}
          </DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-xl bg-navy">
          <LiveView {...live} enabled={enabled} label={`${camera.name} live feed`} large />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
            {isLive ? (
              <span className="live-dot" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            )}
            {isLive ? "LIVE" : live.status === "connecting" ? "CONNECTING" : "OFFLINE"}
          </span>
          <span className="absolute right-3 top-3 rounded-md bg-black/40 px-2.5 py-1 font-mono text-[11px] text-white/90">
            {timestamp(now)}
          </span>
        </div>
        <p className="text-xs font-medium text-text-secondary">
          People detected:{" "}
          <span className="font-semibold text-navy">{isLive ? live.people.length : "—"}</span>
          <span className="mx-3">·</span>
          Recognized: <span className="font-semibold text-navy">{isLive ? recognized : "—"}</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
