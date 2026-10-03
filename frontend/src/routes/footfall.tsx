import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DoorOpen, Footprints, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageShell } from "@/components/dewin/PageShell";
import { EmptyState, Panel, QueryState, StatTile } from "@/components/dewin/Panel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFootfallSummary } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { pageMeta } from "@/lib/meta";

export const Route = createFileRoute("/footfall")({
  head: () =>
    pageMeta(
      "Footfall Analytics — Deco Vision",
      "Entry and exit footfall trends for your premises.",
    ),
  component: Page,
});

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

function Page() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["footfall"],
    queryFn: getFootfallSummary,
    refetchInterval: 30_000,
  });

  return (
    <PageShell>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Unique visitors today"
          value={data?.unique_today ?? "—"}
          hint="each person counted once across all gates"
        />
        <StatTile label="New today" value={data?.new_today ?? "—"} />
        <StatTile
          label="Returning"
          value={data?.returning_today ?? "—"}
          hint="seen on an earlier day"
        />
        <StatTile
          label="Busiest hour"
          value={data?.busiest_hour != null ? hourLabel(data.busiest_hour) : "—"}
          hint={data ? `avg ${data.avg_per_gate} per gate` : undefined}
        />
      </div>

      <QueryState isLoading={isLoading} error={error} />
      {data && !data.model_ready && (
        <p className="mb-5 rounded-xl bg-pink-soft px-4 py-3 text-sm font-medium text-pink">
          The Re-ID model is missing on the backend, so counts are unreliable until it is installed.
        </p>
      )}

      {data && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Panel icon={Footprints} title="Arrivals by hour">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly.map((r) => ({ ...r, label: hourLabel(r.hour) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    width={32}
                  />
                  <Tooltip cursor={{ fill: "var(--brand-blue-tint)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="today"
                    name="Today"
                    fill="var(--brand-blue)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="yesterday"
                    name="Yesterday"
                    fill="var(--brand-blue-soft)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel icon={DoorOpen} title="Entry gates">
            {data.gates.length === 0 ? (
              <EmptyState icon={DoorOpen} title="No gate cameras">
                Set a camera's purpose to "Entry/Exit" in{" "}
                <Link to="/cameras" className="text-brand-blue underline">
                  Camera Management
                </Link>{" "}
                to count footfall there.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {data.gates.map((g) => (
                  <li key={g.camera_id} className="flex items-center justify-between py-3 text-sm">
                    <span className="font-semibold text-navy">{g.name}</span>
                    <span className="flex items-center gap-3 text-xs font-medium text-text-secondary">
                      {g.unique_today} today
                      {g.counting ? (
                        <Badge className="bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft">
                          Counting
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not counting</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={Users} title="Today's visitors" className="xl:col-span-2">
            {data.visitors.length === 0 ? (
              <EmptyState icon={Users} title="No visitors counted yet today" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>First seen</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Gates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.visitors.map((v) => (
                    <TableRow key={v.person}>
                      <TableCell className="font-semibold text-navy">{v.person}</TableCell>
                      <TableCell>{formatTime(v.first_seen)}</TableCell>
                      <TableCell>{formatTime(v.last_seen)}</TableCell>
                      <TableCell>{v.gates.join(", ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Panel>
        </div>
      )}
    </PageShell>
  );
}
