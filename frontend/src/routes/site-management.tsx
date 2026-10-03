import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { createSite, deleteSite, getSites, updateSite, type Site } from "@/lib/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/site-management")({
  head: () =>
    pageMeta("Site Management — Deco Vision", "Manage sites, locations and their cameras."),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const [editing, setEditing] = useState<Site | "new" | null>(null);
  const [deleting, setDeleting] = useState<Site | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => deleteSite(id),
    onSuccess: () => {
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["sites"] });
    },
  });

  const sites = data ?? [];
  const cameraCount = sites.reduce((n, s) => n + s.cameras.length, 0);

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Sites" value={data ? sites.length : "—"} />
        <StatTile label="Cameras across sites" value={data ? cameraCount : "—"} />
      </div>

      <Panel
        icon={Building2}
        title="Site Management"
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Add site
          </Button>
        }
      >
        <QueryState isLoading={isLoading} error={error} />
        {data && sites.length === 0 && (
          <EmptyState icon={Building2} title="No sites yet">
            Add a site, then assign cameras to it in Camera Management.
          </EmptyState>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((s) => {
            const active = s.cameras.filter((c) => c.status === "active").length;
            return (
              <article
                key={s.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-navy">{s.name}</h3>
                    <p className="text-xs font-medium text-text-secondary">
                      {s.description || "No description"}
                    </p>
                  </div>
                  {active > 0 ? (
                    <Badge className="bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  {s.cameras.length} camera{s.cameras.length === 1 ? "" : "s"}
                </p>
                <ul className="mt-1 flex-1 space-y-0.5 text-sm text-navy">
                  {s.cameras.map((c) => (
                    <li key={c.id} className="truncate">
                      {c.name}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => setEditing(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 className="h-4 w-4 text-pink" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      {editing && (
        <SiteDialog site={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.cameras.length
                ? `${deleting.cameras.length} camera(s) are assigned to this site.`
                : "This site has no cameras."}{" "}
              This can't be undone.
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

function SiteDialog({ site, onClose }: { site: Site | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(site?.name ?? "");
  const [description, setDescription] = useState(site?.description ?? "");
  const save = useMutation({
    mutationFn: () =>
      site
        ? updateSite(site.id, { name: name.trim(), description })
        : createSite({ name: name.trim(), description }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["sites"] });
      await qc.invalidateQueries({ queryKey: ["cameras"] });
      onClose();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{site ? `Edit ${site.name}` : "Add site"}</DialogTitle>
            <DialogDescription>A location that groups cameras together.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Name</Label>
            <Input id="site-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site-desc">Description</Label>
            <Textarea
              id="site-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {save.error && <p className="text-sm font-medium text-pink">{save.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
