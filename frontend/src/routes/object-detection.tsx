import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/dewin/PageShell";

export const Route = createFileRoute("/object-detection")({
  head: () => ({
    meta: [
      { title: "Object Detection — Deco Vision" },
      { name: "description", content: "Detected objects and asset tracking from camera feeds." },
      { property: "og:title", content: "Object Detection — Deco Vision" },
      { property: "og:description", content: "Detected objects and asset tracking from camera feeds." },
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
        <h2 className="text-xl font-bold text-navy">Object Detection</h2>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">Detected objects and asset tracking from camera feeds.</p>
      </section>
    </PageShell>
  );
}
