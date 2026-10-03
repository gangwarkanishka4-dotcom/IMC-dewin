import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { IdCard, ImagePlus, Loader2, Plus, Search, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AuthImage, ImagePlaceholder } from "@/components/dewin/AuthImage";
import { PageShell } from "@/components/dewin/PageShell";
import { EmptyState, Panel, QueryState, StatTile } from "@/components/dewin/Panel";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  enrollFacePhoto,
  getIdentityPeople,
  identityPhotoUrl,
  saveIdentityPerson,
  type IdentityPerson,
} from "@/lib/api";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/identity")({
  head: () => pageMeta("Identity — Deco Vision", "Manage known people and employee identities."),
  component: Page,
});

function Page() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["identity"],
    queryFn: getIdentityPeople,
  });
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<IdentityPerson | "new" | null>(null);
  const people = data ?? [];
  const q = query.trim().toLowerCase();
  const shown = people.filter(
    (p) =>
      !q || [p.name, p.employee_id, p.department ?? ""].some((v) => v.toLowerCase().includes(q)),
  );
  const enrolled = people.filter((p) => p.embedding_count > 0).length;

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="People" value={data ? people.length : "—"} />
        <StatTile
          label="Face enrolled"
          value={data ? enrolled : "—"}
          hint="at least one reference photo"
        />
        <StatTile
          label="Not enrolled"
          value={data ? people.length - enrolled : "—"}
          hint="can't be recognised yet"
        />
      </div>

      <Panel
        icon={IdCard}
        title="Identity"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-secondary" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, department"
                className="w-64 pl-8"
              />
            </div>
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> Add person
            </Button>
          </div>
        }
      >
        <QueryState isLoading={isLoading} error={error} />
        {data && shown.length === 0 && (
          <EmptyState icon={Users} title={people.length ? "No matches" : "No people yet"}>
            {people.length
              ? "Try a different search."
              : "Add a person and upload a face photo to enroll them."}
          </EmptyState>
        )}
        {shown.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Face photos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => {
                const photo = p.photos[0];
                return (
                  <TableRow key={p.employee_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <AuthImage
                            queryKey={["identity-photo", photo.id]}
                            load={() => identityPhotoUrl(photo.id)}
                            alt={p.name}
                            className="h-9 w-9 rounded-full"
                          />
                        ) : (
                          <ImagePlaceholder className="h-9 w-9 rounded-full" />
                        )}
                        <span className="font-semibold text-navy">{p.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.employee_id}</TableCell>
                    <TableCell>{p.department ?? "—"}</TableCell>
                    <TableCell>{p.person_type ?? "Employee"}</TableCell>
                    <TableCell>
                      {p.embedding_count > 0 ? (
                        <Badge className="bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft">
                          {p.embedding_count} enrolled
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not enrolled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                        <ImagePlus className="h-4 w-4" /> Edit / add photo
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>

      {editing && (
        <PersonDialog
          person={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </PageShell>
  );
}

function PersonDialog({ person, onClose }: { person: IdentityPerson | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [employeeId, setEmployeeId] = useState(person?.employee_id ?? "");
  const [name, setName] = useState(person?.name ?? "");
  const [department, setDepartment] = useState(person?.department ?? "");
  const [type, setType] = useState(person?.person_type ?? "Employee");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const id = employeeId.trim();
      await saveIdentityPerson({
        employee_id: id,
        name: name.trim(),
        department: department.trim() || null,
        person_type: type,
      });
      if (photo) await enrollFacePhoto(id, photo, photo.name);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["identity"] });
      onClose();
    },
    // The person record may already be saved when only the photo failed
    // (e.g. "No face detected in photo") — refresh so the list shows it.
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Save failed");
      void qc.invalidateQueries({ queryKey: ["identity"] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    save.mutate();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{person ? `Edit ${person.name}` : "Add person"}</DialogTitle>
            <DialogDescription>
              A face photo enrolls this person for live recognition on every camera.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eid">Employee ID</Label>
              <Input
                id="eid"
                required
                value={employeeId}
                disabled={!!person}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Input id="type" value={type} onChange={(e) => setType(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept">Department</Label>
            <Input id="dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo">
              Face photo {person ? "(adds another reference)" : "(optional)"}
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          {error && <p className="text-sm font-medium text-pink">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
