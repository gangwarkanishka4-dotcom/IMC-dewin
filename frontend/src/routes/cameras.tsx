import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Cctv, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { PageShell } from "@/components/dewin/PageShell";
import { EmptyState, Panel, QueryState, StatTile } from "@/components/dewin/Panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createCamera,
  deleteCamera,
  getCameras,
  getSites,
  updateCamera,
  type Camera,
  type CameraInput,
} from "@/lib/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/cameras")({
  head: () =>
    pageMeta(
      "Camera Management — Deco Vision",
      "Add, configure and monitor the health of your cameras.",
    ),
  component: Page,
});

/** "Entry/Exit" makes a camera a footfall gate (backend/app/footfall.py). */
const PURPOSES = ["GENERAL", "Entry/Exit"];

function Page() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["cameras"], queryFn: getCameras });
  const [editing, setEditing] = useState<Camera | "new" | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => deleteCamera(id),
    onSuccess: () => {
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["cameras"] });
      void qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const cameras = data ?? [];
  const active = cameras.filter((c) => c.status === "active").length;
  const gates = cameras.filter((c) => c.purpose === "Entry/Exit").length;

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Cameras" value={data ? cameras.length : "—"} />
        <StatTile label="Active" value={data ? active : "—"} />
        <StatTile label="Footfall gates" value={data ? gates : "—"} hint='purpose "Entry/Exit"' />
      </div>

      <Panel
        icon={Cctv}
        title="Camera Management"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add camera
          </Button>
        }
      >
        <QueryState isLoading={isLoading} error={error} />
        {data && cameras.length === 0 && (
          <EmptyState icon={Cctv} title="No cameras yet">
            Add an RTSP camera to start live analytics.
          </EmptyState>
        )}
        {cameras.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camera</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Live feed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cameras.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <p className="font-semibold text-navy">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.cam_code || `CAM-${c.id}`}</p>
                  </TableCell>
                  <TableCell>{c.site}</TableCell>
                  <TableCell>{c.purpose ?? "GENERAL"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {c.host ? (
                      `${c.host}:${c.port ?? 554}`
                    ) : (
                      <span className="text-text-secondary">not configured</span>
                    )}
                  </TableCell>
                  <TableCell>{c.live_feed_enabled ? "On" : "Off"}</TableCell>
                  <TableCell>
                    {c.status === "active" ? (
                      <Badge className="bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => setEditing(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-4 w-4 text-pink" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {editing && (
        <CameraDialog
          camera={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The camera stops streaming and is removed from every analytic. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && <p className="text-sm font-medium text-pink">{remove.error.message}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function CameraDialog({ camera, onClose }: { camera: Camera | null; onClose: () => void }) {
  const qc = useQueryClient();
  const sites = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const [form, setForm] = useState({
    name: camera?.name ?? "",
    site: camera?.site ?? "",
    cam_code: camera?.cam_code ?? "",
    purpose: camera?.purpose ?? "GENERAL",
    host: camera?.host ?? "",
    port: String(camera?.port ?? 554),
    user: camera?.user ?? "",
    password: "",
    stream_path: camera?.stream_path ?? "/h264/ch1/sub/av_stream",
    vendor: camera?.vendor ?? "",
    live_feed_enabled: camera ? camera.live_feed_enabled !== 0 : true,
    attendance_tracking: camera ? camera.attendance_tracking !== 0 : true,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const { password, port, ...rest } = form;
      const payload: CameraInput = { ...rest, port: Number(port) || 554 };
      // The backend never sends the stored password back, so a blank field
      // on edit means "keep the current one".
      if (password) payload.password = password;
      return camera ? updateCamera(camera.id, payload) : createCamera(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["cameras"] });
      await qc.invalidateQueries({ queryKey: ["sites"] });
      onClose();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  const field = (
    key: "name" | "cam_code" | "host" | "port" | "user" | "password" | "stream_path" | "vendor",
    label: string,
    props: Record<string, unknown> = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input id={key} value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{camera ? `Edit ${camera.name}` : "Add camera"}</DialogTitle>
            <DialogDescription>
              RTSP connection details for the camera or NVR channel.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {field("name", "Name", { required: true })}
            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select value={form.site} onValueChange={(v) => set("site", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site" />
                </SelectTrigger>
                <SelectContent>
                  {(sites.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("cam_code", "Camera code")}
            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "Entry/Exit" ? "Entry/Exit (footfall gate)" : "General"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {field("host", "Host / IP")}
            {field("port", "RTSP port", { inputMode: "numeric" })}
            {field("user", "Username", { autoComplete: "off" })}
            {field("password", camera ? "Password (blank = unchanged)" : "Password", {
              type: "password",
              autoComplete: "new-password",
            })}
            {field("stream_path", "Stream path")}
            {field("vendor", "Vendor")}
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-medium text-navy">
              <Switch
                checked={form.live_feed_enabled}
                onCheckedChange={(v) => set("live_feed_enabled", v)}
              />{" "}
              Live feed
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-navy">
              <Switch
                checked={form.attendance_tracking}
                onCheckedChange={(v) => set("attendance_tracking", v)}
              />{" "}
              Attendance tracking
            </label>
          </div>
          {save.error && <p className="text-sm font-medium text-pink">{save.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !form.name.trim() || !form.site}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
