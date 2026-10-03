import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera as CameraIcon,
  CheckCircle2,
  ListChecks,
  ScanFace,
  SkipForward,
} from "lucide-react";
import { useState } from "react";
import { AuthImage } from "@/components/dewin/AuthImage";
import { PageShell } from "@/components/dewin/PageShell";
import { EmptyState, Panel, QueryState, StatTile } from "@/components/dewin/Panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  captureImageUrl,
  getCollectionStatus,
  getModelStatus,
  getNextCapture,
  getTrainingEmployees,
  getTrainingHistory,
  getTrainingStats,
  labelCapture,
  skipCapture,
} from "@/lib/api";
import { formatTime } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/face-recognition")({
  head: () =>
    pageMeta(
      "Face Recognition — Deco Vision",
      "Employee face recognition matches and confidence scores.",
    ),
  component: Page,
});

function Page() {
  const stats = useQuery({ queryKey: ["training-stats"], queryFn: getTrainingStats });
  const model = useQuery({ queryKey: ["model-status"], queryFn: getModelStatus });
  const history = useQuery({
    queryKey: ["training-history"],
    queryFn: () => getTrainingHistory(5),
  });
  const collection = useQuery({
    queryKey: ["collection"],
    queryFn: getCollectionStatus,
    refetchInterval: 30_000,
  });

  const latest = history.data?.[0];
  const labeled = stats.data?.by_status["labeled"] ?? 0;
  const accuracy = latest?.validation_accuracy;

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Recognition model"
          value={model.data ? (model.data.classifier_trained ? "Trained" : "Not trained") : "—"}
          hint={
            model.data?.trained_at ? `last trained ${formatTime(model.data.trained_at)}` : undefined
          }
        />
        <StatTile
          label="Validation accuracy"
          value={accuracy != null ? `${(accuracy * 100).toFixed(1)}%` : "—"}
          hint={
            latest
              ? `${latest.class_count} people · ${latest.sample_count.toLocaleString()} samples`
              : undefined
          }
        />
        <StatTile
          label="Labelled faces"
          value={stats.data ? labeled.toLocaleString() : "—"}
          hint="training samples"
        />
        <StatTile
          label="Captured faces"
          value={stats.data ? stats.data.all_captures.toLocaleString() : "—"}
          hint={stats.data ? `${stats.data.reviewed.toLocaleString()} reviewed` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <ReviewQueue />

        <div className="flex flex-col gap-5">
          <Panel icon={CameraIcon} title="Face collection">
            <QueryState isLoading={collection.isLoading} error={collection.error} />
            {collection.data && (
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-text-secondary">
                    <span>
                      {collection.data.session?.status === "running"
                        ? "Collecting"
                        : "Not collecting"}
                      {collection.data.limit_reached && " · capture limit reached"}
                    </span>
                    <span>
                      {collection.data.current_total.toLocaleString()} /{" "}
                      {collection.data.capture_limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      (collection.data.current_total / Math.max(1, collection.data.capture_limit)) *
                      100
                    }
                  />
                </div>
                <ul className="divide-y divide-border">
                  {Object.entries(collection.data.per_camera).map(([id, cam]) => (
                    <li key={id} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-semibold text-navy">{cam.camera_name}</span>
                      <span className="flex items-center gap-2 text-xs text-text-secondary">
                        {cam.total.toLocaleString()} captures
                        <Badge
                          variant={
                            cam.health === "ok" || cam.health === "healthy"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {cam.health}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel icon={ListChecks} title="Training history">
            <QueryState isLoading={history.isLoading} error={history.error} />
            {history.data?.length === 0 && (
              <EmptyState icon={ListChecks} title="No training runs yet" />
            )}
            <ul className="divide-y divide-border">
              {(history.data ?? []).map((run) => (
                <li key={run.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-navy">{formatTime(run.trained_at)}</span>
                  <span className="text-xs text-text-secondary">
                    {run.class_count} people · {run.sample_count.toLocaleString()} samples
                    {run.validation_accuracy != null &&
                      ` · ${(run.validation_accuracy * 100).toFixed(1)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}

/** One unlabelled camera capture at a time: name who it is, or skip it. */
function ReviewQueue() {
  const qc = useQueryClient();
  const next = useQuery({ queryKey: ["training-next"], queryFn: getNextCapture });
  const employees = useQuery({ queryKey: ["training-employees"], queryFn: getTrainingEmployees });
  const [employeeId, setEmployeeId] = useState("");
  const capture = next.data?.capture;

  const refresh = () => {
    setEmployeeId("");
    void qc.invalidateQueries({ queryKey: ["training-next"] });
    void qc.invalidateQueries({ queryKey: ["training-stats"] });
  };
  const label = useMutation({
    mutationFn: () => labelCapture(capture!.id, employeeId),
    onSuccess: refresh,
  });
  const skip = useMutation({ mutationFn: () => skipCapture(capture!.id), onSuccess: refresh });
  const busy = label.isPending || skip.isPending;
  const failure = label.error ?? skip.error;

  return (
    <Panel icon={ScanFace} title="Review captured faces">
      <QueryState isLoading={next.isLoading} error={next.error} />
      {next.data && !capture && (
        <EmptyState icon={CheckCircle2} title="Review queue is empty">
          Every captured face has been reviewed. New captures from the cameras appear here.
        </EmptyState>
      )}
      {capture && (
        <div className="flex flex-col gap-4 sm:flex-row">
          <AuthImage
            queryKey={["capture", capture.id]}
            load={() => captureImageUrl(capture.id)}
            alt="Captured face"
            className="h-56 w-56 shrink-0 rounded-xl"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="text-xs font-medium text-text-secondary">
              <p className="text-sm font-semibold text-navy">{capture.camera_name}</p>
              <p>{formatTime(capture.captured_at)}</p>
              <p>Detection confidence {(capture.detection_confidence * 100).toFixed(0)}%</p>
            </div>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Who is this?" />
              </SelectTrigger>
              <SelectContent>
                {(employees.data ?? []).map((e) => (
                  <SelectItem key={e.employee_id} value={e.employee_id}>
                    {e.name} ({e.employee_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button disabled={!employeeId || busy} onClick={() => label.mutate()}>
                <CheckCircle2 className="h-4 w-4" /> Label
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => skip.mutate()}>
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </div>
            {failure && <p className="text-sm font-medium text-pink">{failure.message}</p>}
          </div>
        </div>
      )}
    </Panel>
  );
}
