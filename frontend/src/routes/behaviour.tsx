import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dewin/PageShell";

export const Route = createFileRoute("/behaviour")({
  head: () => ({
    meta: [
      { title: "Behaviour Analytics — Deco Vision" },
      { name: "description", content: "Behaviour patterns and anomaly insights from AI analysis." },
      { property: "og:title", content: "Behaviour Analytics — Deco Vision" },
      { property: "og:description", content: "Behaviour patterns and anomaly insights from AI analysis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PageShell>
      <section className="rounded-2xl border border-border bg-card p-8 shadow-card">
        <h2 className="text-xl font-bold text-navy">Behaviour Analytics</h2>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">Behaviour patterns and anomaly insights from AI analysis.</p>
      </section>
    </PageShell>
  );
}
