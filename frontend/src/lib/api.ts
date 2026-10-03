/**
 * Deco Vision backend client (FastAPI, backend/app).
 *
 * Every page reads its data through these functions. Auth follows the
 * backend's session model (backend/app/auth.py): POST /auth/login returns a
 * server-side session token, sent as `Authorization: Bearer` on every
 * request and as `?token=` on the camera websockets (browsers can't attach
 * headers to a WebSocket handshake).
 */

/** e.g. http://127.0.0.1:8821/api — set VITE_API_BASE_URL in frontend/.env */
export const BASE_URL = String(
  import.meta.env["VITE_API_BASE_URL"] ?? "http://127.0.0.1:8821/api",
).replace(/\/$/, "");

const WS_ROOT = BASE_URL.replace(/\/api$/, "").replace(/^http/, "ws");

const TOKEN_KEY = "deco_token";
const USER_KEY = "deco_user";

export type SessionUser = { email: string; name: string };

const isBrowser = () => typeof window !== "undefined";

export function getToken(): string | null {
  return isBrowser() ? window.localStorage.getItem(TOKEN_KEY) : null;
}

export function getUser(): SessionUser | null {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) ?? "null") as SessionUser | null;
  } catch {
    return null;
  }
}

function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/** A 401/403 while holding a token means the session was revoked or expired. */
function handleAuthFailure() {
  if (!getToken()) return;
  clearSession();
  if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function errorFrom(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
  const detail = typeof body?.detail === "string" ? body.detail : `Request failed (${res.status})`;
  return new ApiError(detail, res.status);
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  // Pages start their queries before PageShell's session check redirects to
  // /login; without a session there is nothing to ask the backend.
  if (!getToken() && path !== "/auth/login") throw new ApiError("Not signed in", 401);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> | undefined) },
  });
  if (res.status === 401 || res.status === 403) handleAuthFailure();
  if (!res.ok) throw await errorFrom(res);
  return res;
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await send(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  return (await res.json()) as T;
}

const post = <T>(path: string, body?: unknown) =>
  json<T>(path, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const put = <T>(path: string, body: unknown) =>
  json<T>(path, { method: "PUT", body: JSON.stringify(body) });
const del = <T>(path: string) => json<T>(path, { method: "DELETE" });

async function blobUrl(path: string): Promise<string> {
  const res = await send(path);
  return URL.createObjectURL(await res.blob());
}

// ---- Auth ------------------------------------------------------------------

export async function login(email: string): Promise<SessionUser> {
  const data = await post<{ email: string; name: string; token: string }>("/auth/login", { email });
  const user = { email: data.email, name: data.name };
  window.localStorage.setItem(TOKEN_KEY, data.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function logout(): Promise<void> {
  try {
    await post("/auth/logout");
  } catch {
    // best-effort server-side revoke; the local session is cleared either way
  }
  clearSession();
}

// ---- Cameras & sites ---------------------------------------------------------

export type Camera = {
  id: number;
  name: string;
  site: string;
  cam_code: string | null;
  purpose: string | null;
  host: string | null;
  port: number | null;
  user: string | null;
  stream_path: string | null;
  vendor: string | null;
  status: string;
  live_feed_enabled: number;
  attendance_tracking: number;
  is_configured: boolean;
  live: boolean;
};

export type CameraInput = {
  name: string;
  site: string;
  cam_code?: string;
  purpose?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  stream_path?: string;
  vendor?: string;
  live_feed_enabled?: boolean;
  attendance_tracking?: boolean;
};

export const getCameras = () => json<Camera[]>("/cameras");
export const createCamera = (c: CameraInput) => post<Camera>("/cameras", c);
export const updateCamera = (id: number, c: Partial<CameraInput>) =>
  put<Camera>(`/cameras/${id}`, c);
export const deleteCamera = (id: number) => del<{ ok: boolean }>(`/cameras/${id}`);

export type Site = {
  id: number;
  name: string;
  description: string;
  cameras: Camera[];
  active_count?: number;
};

export const getSites = () => json<Site[]>("/sites");
export const createSite = (s: { name: string; description?: string }) =>
  post<{ ok: boolean }>("/sites", s);
export const updateSite = (id: number, s: { name?: string; description?: string }) =>
  put<{ ok: boolean }>(`/sites/${id}`, s);
export const deleteSite = (id: number) => del<{ ok: boolean }>(`/sites/${id}`);

// ---- Dashboard / settings ----------------------------------------------------------

export type Stats = {
  total_cameras: number;
  active_cameras: number;
  faces_enrolled: number;
  active_alerts: number;
  detections_today: number;
};
export const getStats = () => json<Stats>("/stats");

export type Settings = { detection_fps: number } & Record<string, unknown>;
export const getSettings = () => json<Settings>("/settings");
export const updateSettings = (s: Partial<Settings>) => put<Settings>("/settings", s);

// ---- Identity (local employee roster + enrolled face photos) --------------------

export type IdentityPerson = {
  employee_id: string;
  name: string;
  department: string | null;
  person_type: string | null;
  created_at: number;
  embedding_count: number;
  photos: { id: number; enrolled_at: number }[];
};

export const getIdentityPeople = () => json<IdentityPerson[]>("/faces/people");
export const saveIdentityPerson = (p: {
  employee_id: string;
  name: string;
  department?: string | null;
  person_type?: string | null;
}) => post<IdentityPerson>("/faces/people", p);
export const identityPhotoUrl = (embeddingId: number) =>
  blobUrl(`/faces/people/photo/${embeddingId}`);

/** multipart: no Content-Type header, so the browser adds the boundary. */
export async function enrollFacePhoto(employeeId: string, file: Blob, filename = "face.jpg") {
  const body = new FormData();
  body.append("person_id", employeeId);
  body.append("photo", file, filename);
  const res = await send("/faces/enroll", { method: "POST", body });
  return (await res.json()) as { ok: boolean; person_id: string; total_embeddings: number };
}

// ---- Face recognition (training dataset, classifier, review queue) ---------------

export type TrainingStats = {
  reviewed: number;
  total: number;
  all_captures: number;
  by_status: Record<string, number>;
};
export type TrainingCapture = {
  id: number;
  camera_id: number;
  camera_name: string;
  captured_at: number;
  detection_confidence: number;
  blur_score: number;
  brightness: number;
};
export type ModelStatus = {
  classifier_trained: boolean;
  path?: string;
  trained_at?: number | null;
};
export type TrainingRun = {
  id: number;
  trained_at: number;
  sample_count: number;
  class_count: number;
  validation_accuracy: number | null;
};
export type CollectionStatus = {
  session: { status: string; started_at: number } | null;
  capture_limit: number;
  current_total: number;
  limit_reached: boolean;
  per_camera: Record<
    string,
    { camera_name: string; collecting: boolean; health: string; total: number }
  >;
};
export type Employee = { employee_id: string; name: string };

export const getTrainingStats = () => json<TrainingStats>("/faces/training/stats");
export const getModelStatus = () => json<ModelStatus>("/faces/training/model-status");
export const getTrainingHistory = (limit = 5) =>
  json<TrainingRun[]>(`/faces/training/training-history?limit=${limit}`);
export const getCollectionStatus = () =>
  json<CollectionStatus>("/faces/training/collection/status");
export const getTrainingEmployees = () => json<Employee[]>("/faces/training/employees");
export const getNextCapture = () =>
  json<{ capture: TrainingCapture | null } & TrainingStats>("/faces/training/next");
export const captureImageUrl = (captureId: number) => blobUrl(`/faces/training/image/${captureId}`);
export const labelCapture = (captureId: number, employeeId: string) =>
  post<unknown>("/faces/training/label", { capture_id: captureId, employee_id: employeeId });
export const skipCapture = (captureId: number) =>
  post<unknown>("/faces/training/skip", { capture_id: captureId });

// ---- Footfall ---------------------------------------------------------------------

export type FootfallSummary = {
  unique_today: number;
  new_today: number;
  returning_today: number;
  avg_per_gate: number;
  busiest_hour: number | null;
  gates: { camera_id: number; name: string; unique_today: number; counting: boolean }[];
  hourly: { hour: number; today: number; yesterday: number }[];
  visitors: { person: string; first_seen: number; last_seen: number; gates: string[] }[];
  model_ready: boolean;
};
export const getFootfallSummary = () => json<FootfallSummary>("/footfall/summary");

// ---- Behavior Analytics (browser webcam frame -> backend/app/behavior_webcam.py) -------

export type BehaviorDetection = {
  bbox: [number, number, number, number];
  track_id: number;
  distracted: boolean;
  category: "Happy" | "Neutral & Engaged" | "Distracted" | null;
  confidence: number;
  label: string | null;
  color: "red" | "green";
  attention?: number;
  /** Head-pose readings behind the Distracted decision (behavior_webcam.py). */
  pitch_ratio?: number | null;
  pitch_floor?: number;
  pitch_ceiling?: number;
  nose_offset?: number | null;
  max_nose_offset?: number;
};
export type BehaviorResult = {
  faces: number;
  frame_width: number;
  frame_height: number;
  detections: BehaviorDetection[];
  stale: boolean;
};

export async function analyzeBehaviorFrame(frame: Blob, reset = false): Promise<BehaviorResult> {
  const body = new FormData();
  body.append("frame", frame, "frame.jpg");
  const res = await send(`/faces/behavior/analyze${reset ? "?reset=true" : ""}`, {
    method: "POST",
    body,
  });
  return (await res.json()) as BehaviorResult;
}

// ---- Live camera websockets ---------------------------------------------------------

/** One person on the live overlay (main.py /ws/detections). `name` is only
 * set once face recognition is confident; otherwise it's a plain person. */
export type LivePerson = {
  track_id: number;
  bbox: [number, number, number, number];
  employee_id: string | null;
  name: string | null;
  color: string | null;
  confidence: number;
};

export const liveFrameSocketUrl = (cameraId: number) =>
  `${WS_ROOT}/ws/live/${cameraId}?token=${encodeURIComponent(getToken() ?? "")}`;
export const liveDetectionsSocketUrl = (cameraId: number) =>
  `${WS_ROOT}/ws/detections/${cameraId}?token=${encodeURIComponent(getToken() ?? "")}`;
