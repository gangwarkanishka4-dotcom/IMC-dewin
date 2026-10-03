import { createFileRoute } from "@tanstack/react-router";
import { Smile, Video, VideoOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/dewin/PageShell";
import { Panel, StatTile } from "@/components/dewin/Panel";
import { Button } from "@/components/ui/button";
import { analyzeBehaviorFrame, type BehaviorDetection, type BehaviorResult } from "@/lib/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/mood-detection")({
  head: () =>
    pageMeta(
      "Mood / Behavior Analytics — Deco Vision",
      "Mood and sentiment detection across monitored spaces.",
    ),
  component: Page,
});

// The backend answers in ~90 ms; a frame arriving while one is still being
// analysed is dropped there and the previous result returned.
const ANALYZE_INTERVAL_MS = 250;
// Detection doesn't need full webcam resolution; this keeps each upload small.
const ANALYZE_WIDTH = 480;

type Box = { leftPct: number; topPct: number; widthPct: number; heightPct: number };

/** The <video> is object-cover: scaled to fill its 16:9 box with the
 * overflowing axis centre-cropped. Boxes are mapped with that same geometry
 * so labels stay on the face. */
function projectBox(
  det: BehaviorDetection,
  frameW: number,
  frameH: number,
  boxW: number,
  boxH: number,
): Box | null {
  if (!frameW || !frameH || !boxW || !boxH) return null;
  const [x1, y1, x2, y2] = det.bbox;
  const scale = Math.max(boxW / frameW, boxH / frameH);
  const offsetX = (frameW * scale - boxW) / 2;
  const offsetY = (frameH * scale - boxH) / 2;
  const pct = (v: number, total: number) => (v / total) * 100;
  return {
    leftPct: pct(x1 * scale - offsetX, boxW),
    topPct: pct(y1 * scale - offsetY, boxH),
    widthPct: pct((x2 - x1) * scale, boxW),
    heightPct: pct((y2 - y1) * scale, boxH),
  };
}

function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const firstFrameRef = useRef(true);

  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BehaviorResult | null>(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setBoxSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One teardown path, so Stop, leaving the page and a failed start all
  // release the camera — the camera light must never stay on.
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setResult(null);
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      firstFrameRef.current = true; // new session -> backend clears its history
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : `Could not start the camera: ${e instanceof Error ? e.message : String(e)}`,
      );
      stopCamera();
    }
  }

  const analyzeFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || busyRef.current) return;
    busyRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = ANALYZE_WIDTH;
      canvas.height = Math.round(video.videoHeight * (ANALYZE_WIDTH / video.videoWidth));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.8));
      if (!blob) return;
      const isFirst = firstFrameRef.current;
      firstFrameRef.current = false;
      setResult(await analyzeBehaviorFrame(blob, isFirst));
      setError("");
    } catch (e) {
      // Detection failing never stops the preview; only the readout reports it.
      setError(e instanceof Error ? e.message : "Detection unavailable");
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => void analyzeFrame(), ANALYZE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, analyzeFrame]);

  const detections = active ? (result?.detections ?? []) : [];
  const current = detections[0];

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Behavior"
          value={current?.category ?? "—"}
          hint="Happy · Neutral & Engaged · Distracted"
        />
        <StatTile
          label="Confidence"
          value={current?.label ? `${current.confidence.toFixed(1)}%` : "—"}
        />
        <StatTile
          label="Attention"
          value={current?.attention != null ? `${Math.round(current.attention * 100)}%` : "—"}
          hint="share of recent frames facing the screen"
        />
      </div>

      <Panel
        icon={Smile}
        title="Mood / Behavior Analytics"
        actions={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              {active && <span className="live-dot" />}
              {active ? "Camera active" : "Camera off"}
            </span>
            {active ? (
              <Button variant="outline" onClick={stopCamera}>
                <VideoOff className="h-4 w-4" /> Stop camera
              </Button>
            ) : (
              <Button onClick={() => void startCamera()}>
                <Video className="h-4 w-4" /> Start camera
              </Button>
            )}
          </div>
        }
      >
        <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-navy">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${active ? "" : "invisible"}`}
          />
          {!active && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-medium text-primary-foreground/80">
              <VideoOff className="h-7 w-7" />
              Press Start camera to analyse behavior from this device's webcam
            </div>
          )}
          {result &&
            detections.map((d) => {
              const pos = projectBox(
                d,
                result.frame_width,
                result.frame_height,
                boxSize.w,
                boxSize.h,
              );
              if (!pos) return null;
              const shade = d.color === "red" ? "var(--pink)" : "var(--live)";
              return (
                <div
                  key={d.track_id}
                  className="pointer-events-none absolute rounded-[3px] border-2"
                  style={{
                    left: `${pos.leftPct}%`,
                    top: `${pos.topPct}%`,
                    width: `${pos.widthPct}%`,
                    height: `${pos.heightPct}%`,
                    borderColor: shade,
                  }}
                >
                  {d.label && (
                    <span
                      className="absolute bottom-full left-0 mb-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold text-primary-foreground shadow-soft"
                      style={{ backgroundColor: shade }}
                    >
                      {d.label}
                    </span>
                  )}
                </div>
              );
            })}
        </div>

        <div className="mx-auto mt-4 max-w-4xl space-y-1 text-sm font-medium text-text-secondary">
          {error && <p className="text-pink">{error}</p>}
          {active && (
            <p>
              Detection:{" "}
              <span className="font-semibold text-navy">
                {result == null
                  ? "Waiting for first result…"
                  : result.faces > 0
                    ? `${result.faces} face${result.faces === 1 ? "" : "s"} detected`
                    : "No face detected"}
              </span>
            </p>
          )}
          {active && current?.pitch_ratio != null && (
            <p className="text-xs">
              Square-on: {current.pitch_ratio} (facing between {current.pitch_floor} and{" "}
              {current.pitch_ceiling}) · Turn: {current.nose_offset} (facing under{" "}
              {current.max_nose_offset})
            </p>
          )}
        </div>
      </Panel>
    </PageShell>
  );
}
