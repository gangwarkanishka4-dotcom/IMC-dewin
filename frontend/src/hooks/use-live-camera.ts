import { useEffect, useRef, useState } from "react";
import { liveDetectionsSocketUrl, liveFrameSocketUrl, type LivePerson } from "@/lib/api";

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Streams one camera from the backend: JPEG frames from /ws/live painted
 * onto a canvas, and the person/recognition overlay from /ws/detections.
 * Boxes come back in the frame's own pixel space, so `frameSize` is
 * exposed for converting them to percentages of the displayed image.
 */
export function useLiveCamera(cameraId: number, enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<LiveStatus>(enabled ? "connecting" : "offline");
  const [people, setPeople] = useState<LivePerson[]>([]);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("offline");
      return;
    }
    setStatus("connecting");
    const img = new Image();
    let objectUrl: string | null = null;
    let closed = false;

    const frames = new WebSocket(liveFrameSocketUrl(cameraId));
    frames.binaryType = "blob";
    frames.onclose = () => !closed && setStatus("offline");
    frames.onerror = () => setStatus("offline");
    frames.onmessage = (event: MessageEvent<Blob>) => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(event.data);
      img.src = objectUrl;
    };
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
        setFrameSize({ w: img.width, h: img.height });
      }
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      setStatus("live");
    };

    const detections = new WebSocket(liveDetectionsSocketUrl(cameraId));
    detections.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as { people?: LivePerson[] };
        setPeople(data.people ?? []);
      } catch {
        // a malformed message just leaves the previous overlay in place
      }
    };

    return () => {
      closed = true;
      frames.close();
      detections.close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cameraId, enabled]);

  return { canvasRef, status, people, frameSize };
}
