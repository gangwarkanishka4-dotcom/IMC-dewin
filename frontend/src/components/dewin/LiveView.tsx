import { VideoOff } from "lucide-react";
import type { LivePerson } from "@/lib/api";
import { recognizedName } from "@/lib/live";
import type { LiveStatus } from "@/hooks/use-live-camera";

// Used only if a detection arrives without a colour. Real colours come from
// the backend's employee -> company mapping (employee_directory.py).
const FALLBACK_LABEL_COLOR = "#6b7280";

/**
 * A camera's live canvas plus its identity overlay: each recognised person's
 * name, centred over them on their company's colour. Person detection and
 * tracking still run in the backend, but no generic box is drawn.
 */
export function LiveView({
  canvasRef,
  status,
  people,
  frameSize,
  enabled,
  label,
  large = false,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: LiveStatus;
  people: LivePerson[];
  frameSize: { w: number; h: number } | null;
  enabled: boolean;
  label: string;
  large?: boolean;
}) {
  const isLive = status === "live";
  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label={label}
        className={`aspect-video h-full w-full object-cover ${isLive ? "" : "invisible"}`}
      />
      {!isLive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-medium text-text-secondary">
          <VideoOff className="h-6 w-6" />
          {!enabled
            ? "Live feed not configured"
            : status === "connecting"
              ? "Connecting to camera…"
              : "Camera offline"}
        </div>
      )}
      {isLive &&
        frameSize &&
        people.map((person) => {
          const name = recognizedName(person);
          if (!name) return null;
          const [x1, y1, x2] = person.bbox;
          return (
            <span
              key={person.track_id}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[3px] px-1.5 py-0.5 font-semibold text-white shadow-soft ${
                large ? "text-sm" : "text-[10px]"
              }`}
              style={{
                left: `${((x1 + x2) / 2 / frameSize.w) * 100}%`,
                top: `${Math.max((y1 / frameSize.h) * 100, large ? 4 : 7)}%`,
                backgroundColor: person.color || FALLBACK_LABEL_COLOR,
              }}
            >
              {name}
            </span>
          );
        })}
    </>
  );
}
